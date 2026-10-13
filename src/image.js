/**
 * 文生图客户端（OpenAI 兼容的 /images/generations）。
 *
 * 为什么单独一个文件：出图和对话是两种完全不同的请求。
 * 对话是流式的、逐字返回；出图是一次性的、要等十几秒、只回一个链接。
 * 混在 llm.js 里只会让两边都难读。
 *
 * 各家的形状差异（实测于 2026-10）：
 *   智谱 CogView  请求尺寸字段 size，响应 data[0].url
 *   硅基流动 Kolors 请求尺寸字段 image_size，响应 images[0].url
 * 所以下面做了双形状容错，两种都认。
 *
 * 密钥由浏览器随请求带上，不落库、不上传。
 */
import { DEFAULT_IMAGE_SIZE, PROVIDERS } from './config.js';

const IMAGE_TIMEOUT_MS = 90_000;

/** 该服务商的出图配置；没有图像接口时为 null。 */
export function imageConfigOf(settings) {
  const provider = PROVIDERS.find((p) => p.id === settings.providerId);
  return provider?.image ?? null;
}

export function isImageReady(settings) {
  const cfg = imageConfigOf(settings);
  return Boolean(settings.apiKey && settings.baseURL && (settings.imageModel || cfg?.model));
}

function endpoints(settings) {
  const base = String(settings.baseURL || '').replace(/\/+$/, '');
  return {
    direct: `${base}/images/generations`,
    proxy: `${location.origin}/api/image`,
  };
}

/** 把外部 signal 和超时合并成一个——AbortSignal.any 兼容性还不够，手写更稳。 */
function withTimeout(signal, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), ms);
  const onAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  return {
    signal: controller.signal,
    done() {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    },
  };
}

/**
 * 从各家不同形状的响应里把图片抠出来。
 * 认这三种：data[0].url（智谱 / OpenAI）、images[0].url（硅基流动）、data[0].b64_json。
 */
function pickImage(payload) {
  const list = payload?.data ?? payload?.images ?? [];
  const first = Array.isArray(list) ? list[0] : null;
  if (!first) return null;
  if (typeof first === 'string') return { url: first };
  if (first.url) return { url: first.url };
  if (first.b64_json) return { url: `data:image/png;base64,${first.b64_json}` };
  return null;
}

function httpError(status, rawText, settings) {
  let detail = rawText;
  try {
    const parsed = JSON.parse(rawText);
    detail = parsed?.error?.message || parsed?.message || rawText;
  } catch {
    /* 保持原始文本 */
  }

  const hint = {
    400: '请求被拒绝。常见原因是模型名或尺寸不被支持，检查「出图设置」里的图片模型与尺寸。',
    401: `密钥校验失败。确认 Key 与当前服务商一致，且这个 Key 有权调用出图模型。`,
    403: '这个 Key 没有调用出图接口的权限，或者该模型未对你开放。',
    404: '出图接口不存在。确认「接口地址」填对——出图走的是同一域名下的 /images/generations。',
    429: '触发频率限制。免费出图模型有固定的限流，等一会儿再试，或先只生成部分画面。',
    500: '服务商内部错误，稍后重试。',
    503: '服务暂时不可用，稍后重试。',
  }[status];

  const err = new Error(
    `${hint || `出图请求失败（HTTP ${status}）`}${detail ? `\n\n原始信息：${String(detail).slice(0, 300)}` : ''}`,
  );
  err.name = 'ImageHttpError';
  err.status = status;
  return err;
}

/**
 * 生成一张图。
 * @returns {Promise<{url: string, raw: object}>}
 */
export async function generateImage({ settings, prompt, negativePrompt, size, signal }) {
  const cfg = imageConfigOf(settings);
  const model = String(settings.imageModel || cfg?.model || '').trim();
  if (!model) throw new Error('还没填出图模型。在「出图设置」里填一个，或换一个支持出图的服务商。');

  // 尺寸字段名优先用用户显式选的，其次用服务商预设，最后兜底 size。
  const sizeKey = settings.sizeKey || cfg?.sizeKey || 'size';
  const body = { model, prompt };
  body[sizeKey] = String(size || settings.imageSize || DEFAULT_IMAGE_SIZE);
  // 支持 negative_prompt 的接口才下发，避免不认识的接口因多余字段报错。
  if (cfg?.negative && negativePrompt) body.negative_prompt = negativePrompt;

  const url = settings.useProxy ? endpoints(settings).proxy : endpoints(settings).direct;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${settings.apiKey}`,
  };
  if (settings.useProxy) headers['x-upstream-base-url'] = String(settings.baseURL).replace(/\/+$/, '');

  const guard = withTimeout(signal, IMAGE_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: guard.signal,
    });
  } catch (err) {
    guard.done();
    if (signal?.aborted) throw err;
    if (err?.message === 'timeout' || err?.name === 'AbortError') {
      const e = new Error('出图超时（等了 90 秒）。免费模型高峰期会排队，稍后重试。');
      e.name = 'ImageTimeout';
      throw e;
    }
    throw err;
  }

  const text = await res.text().catch(() => '');
  guard.done();

  if (!res.ok) throw httpError(res.status, text, settings);

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`出图接口返回的不是 JSON，多半是接口地址不对。\n\n原始信息：${text.slice(0, 200)}`);
  }

  const picked = pickImage(payload);
  if (picked) return { url: picked.url, raw: payload };

  // 没拿到图但请求成功，通常是内容审核拦下的。
  const filtered = Array.isArray(payload?.content_filter) && payload.content_filter.length > 0;
  throw new Error(
    filtered
      ? '这张图被服务商的内容审核拦下了。改写这个画面的描述，或跳过它。'
      : `出图接口没有返回图片。\n\n原始信息：${text.slice(0, 200)}`,
  );
}

export { httpError as imageHttpError };

/** 把出图的各种失败翻译成一句能直接照做的话。 */
export function describeImageError(err, settings) {
  if (err?.name === 'AbortError') return '已停止。';
  if (err?.name === 'ImageHttpError') return err.message;
  if (err?.name === 'ImageTimeout') return err.message;

  // fetch 抛 TypeError 基本都是跨域被拦或断网。
  if (err instanceof TypeError) {
    if (settings.useProxy) return '连不上本地代理。确认 `node server.mjs` 正在运行，然后重试。';
    return '浏览器连不上出图接口。可能是服务商没开出图接口的跨域，或接口地址写错。可以在「模型设置」里勾选本地代理并先运行 `node server.mjs`。';
  }

  return err?.message || '出图失败，重试看看。';
}
