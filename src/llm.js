/**
 * 最小化的 OpenAI 兼容客户端。
 * 只做一件事：把消息发出去，把流式增量交回来。
 * 密钥来自浏览器本地存储，不上传、不落库。
 */
import { DEFAULT_IMAGE_SIZE, STORAGE_KEY, PROVIDERS } from './config.js';

const DEFAULT_SETTINGS = Object.freeze({
  providerId: 'deepseek',
  baseURL: PROVIDERS[0].baseURL,
  model: PROVIDERS[0].model,
  apiKey: '',
  useProxy: false,
  // 出图侧。imageModel 留空表示用当前服务商的默认出图模型。
  imageModel: '',
  imageSize: DEFAULT_IMAGE_SIZE,
  sizeKey: '',
  autoImage: true,
});

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function isConfigured(settings) {
  return Boolean(settings.apiKey && settings.baseURL && settings.model);
}

/* ---------- 请求构造 ---------- */

function endpoints(settings) {
  const base = String(settings.baseURL || '').replace(/\/+$/, '');
  const direct = `${base}/chat/completions`;
  const proxy = `${location.origin}/api/chat`;
  return { direct, proxy };
}

async function postStream({ url, settings, messages, temperature, signal, onDelta, viaProxy }) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${settings.apiKey}`,
  };
  if (viaProxy) headers['x-upstream-base-url'] = settings.baseURL.replace(/\/+$/, '');

  const body = {
    model: settings.model,
    messages,
    stream: true,
    temperature: typeof temperature === 'number' ? temperature : 0.85,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw httpError(res.status, text, settings);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;

      let chunk;
      try {
        chunk = JSON.parse(payload);
      } catch {
        continue;
      }
      const delta = chunk?.choices?.[0]?.delta?.content;
      if (delta) {
        full += delta;
        onDelta?.(delta, full);
      }
    }
  }

  return full;
}

/**
 * 直连失败时（多半是跨域被拦），自动改走本地代理再试一次。
 * 只在还没收到任何内容时重试，避免重复输出。
 */
export async function chat({ settings, messages, temperature, signal, onDelta }) {
  const { direct, proxy } = endpoints(settings);
  let received = false;
  const trackDelta = (d, full) => {
    received = true;
    onDelta?.(d, full);
  };

  try {
    return await postStream({
      url: settings.useProxy ? proxy : direct,
      settings,
      messages,
      temperature,
      signal,
      onDelta: trackDelta,
      viaProxy: settings.useProxy,
    });
  } catch (err) {
    const blocked = err instanceof TypeError;
    const canRetryLocal = !received && !settings.useProxy && location.hostname === 'localhost';
    if (blocked && canRetryLocal) {
      return await postStream({
        url: proxy,
        settings,
        messages,
        temperature,
        signal,
        onDelta: trackDelta,
        viaProxy: true,
      });
    }
    throw err;
  }
}

/* ---------- 错误信息 ---------- */

function httpError(status, rawText, settings) {
  let detail = rawText;
  try {
    const parsed = JSON.parse(rawText);
    detail = parsed?.error?.message || parsed?.message || rawText;
  } catch {
    /* 保持原始文本 */
  }

  const hint = {
    400: '请求被拒绝，常见原因是模型名写错或该模型不支持当前参数。',
    401: `密钥校验失败。请确认 Key 与「${settings.model}」所属的服务商一致。`,
    403: '这个 Key 没有访问该模型的权限。',
    404: '接口地址或模型名不存在，检查上面两栏是否填对。',
    429: '触发频率限制或额度用尽，稍后再试。',
    500: '服务商内部错误，稍后重试。',
    502: '网关错误，稍后重试。',
    503: '服务暂时不可用，稍后重试。',
  }[status];

  const err = new Error(`${hint || `请求失败（HTTP ${status}）`}${detail ? `\n\n原始信息：${String(detail).slice(0, 300)}` : ''}`);
  err.name = 'LLMHttpError';
  err.status = status;
  return err;
}

/** 网络层的跨域/断网提示，单独识别以便给出可执行建议。 */
export function describeError(err, settings) {
  if (err?.name === 'AbortError') return '已停止。';
  if (err?.name === 'LLMHttpError') return err.message;
  if (err instanceof TypeError) {
    return settings.useProxy
      ? '连不上本地代理。确认 `node server.mjs` 正在运行，然后重试。'
      : '浏览器无法直连该接口，通常是服务商没开跨域。可以在「模型设置」里勾选「经本地代理转发」，并先运行 `node server.mjs`。';
  }
  return err?.message || '出了点意外，重试看看。';
}

/* ---------- JSON 提取 ---------- */

/** 模型偶尔会包一层 markdown 或多说一句话，这里做一次容错提取。 */
export function extractJson(text) {
  if (!text) throw new Error('模型没有返回内容。');

  let cleaned = String(text).trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) cleaned = fence[1].trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    /* 继续尝试括号匹配 */
  }

  const start = cleaned.search(/[{[]/);
  if (start === -1) throw new Error('返回内容里找不到 JSON。');

  const open = cleaned[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === open) depth += 1;
    if (ch === close) {
      depth -= 1;
      if (depth === 0) return JSON.parse(cleaned.slice(start, i + 1));
    }
  }

  throw new Error('返回的 JSON 不完整，多半是被长度上限截断了。换一个更短的梦再试。');
}
