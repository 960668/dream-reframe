/**
 * 零依赖本地服务：静态文件 + 接口转发。
 *
 * 为什么需要它：部分模型服务商没有开放浏览器跨域（CORS），
 * 页面直连会被浏览器拦下来。这个脚本把请求从本机转发出去，绕过限制。
 *
 * 用法：
 *   node server.mjs            # 默认 http://127.0.0.1:8080
 *   PORT=3000 node server.mjs
 *
 * 说明：它不保存任何密钥。密钥由浏览器随每次请求带上，只在本机内存里过一次。
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const HOST = '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
};

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';

  const filePath = path.join(ROOT, pathname);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404 Not Found');
  }
}

/**
 * 把请求转发到上游。
 * 对话是流式的（边收边发，用户能看见字一个个出来）；
 * 出图是一次性 JSON（等十几秒，然后一次返回）。
 * 两者只差「是否边收边发」，所以合并成一个函数。
 */
async function forward(req, res, { suffix, stream }) {
  const upstream = req.headers['x-upstream-base-url'];
  const auth = req.headers.authorization;

  if (!upstream || !auth) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: { message: '缺少接口地址或密钥。' } }));
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);

  let target;
  try {
    target = new URL(`${String(upstream).replace(/\/+$/, '')}${suffix}`);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: { message: '接口地址不是合法的 URL。' } }));
    return;
  }

  try {
    const upstreamRes = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body,
    });

    res.writeHead(upstreamRes.status, {
      'Content-Type': upstreamRes.headers.get('content-type') || 'application/json; charset=utf-8',
      'Cache-Control': 'no-cache',
      ...(stream ? { Connection: 'keep-alive' } : {}),
    });

    if (!upstreamRes.body) {
      res.end(await upstreamRes.text());
      return;
    }

    const reader = upstreamRes.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: { message: `转发失败：${err.message}` } }));
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/chat') {
    forward(req, res, { suffix: '/chat/completions', stream: true });
    return;
  }
  if (req.method === 'POST' && req.url === '/api/image') {
    forward(req, res, { suffix: '/images/generations', stream: false });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end('Method Not Allowed');
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`梦境重构已启动 → http://${HOST}:${PORT}`);
  console.log('按 Ctrl+C 停止。');
});
