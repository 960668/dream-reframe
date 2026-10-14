/**
 * 流式链路（两段，加上可选的出图）：
 *   1) 解析梦境 + 编排画面  —— 合并为一次调用，省一次往返
 *   2) 生成视觉提示词        —— 依赖第 1 步的结构化结果
 *   3) 出图（可选）          —— 见文件末尾，可跳过、可单张重来
 *
 * 合并第 1、2 步是一个刻意的取舍：解析和编排共享同一份上下文，
 * 拆成两次调用只会多付一次延迟和一次输入 token，换不到质量提升。
 *
 * 画面字段用 sensation（身体感）而不是 camera（运镜）：
 * 刻意避开电影语法，因为梦的记忆单位是「画面 + 身体感」，不是「镜头」。
 * 视角与构图交给第二段按画面内容决定。
 */
import { chat, extractJson } from './llm.js';
import { generateImage, imageConfigOf } from './image.js';
import {
  ANALYZE_SYSTEM,
  analyzeUserPrompt,
  composeImagePrompt,
  IMAGE_NEGATIVE,
  VISUAL_SYSTEM,
  visualUserPrompt,
} from './prompts.js';

const asArray = (value) => {
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim());
  if (typeof value === 'string' && value.trim()) return value.split(/[、,，\s]+/).filter(Boolean);
  return [];
};

function normalizeAnalysis(raw) {
  const shots = Array.isArray(raw?.shots) ? raw.shots : [];
  if (shots.length === 0) throw new Error('模型没有给出画面，换个说法再试一次。');

  return {
    title: String(raw?.title || '未命名的梦').trim(),
    thesis: String(raw?.thesis || '').trim(),
    mood: asArray(raw?.mood),
    motifs: asArray(raw?.motifs),
    shots: shots.slice(0, 6).map((shot, index) => ({
      no: Number(shot?.no) || index + 1,
      caption: String(shot?.caption || `画面 ${index + 1}`).trim(),
      scene: String(shot?.scene || '').trim(),
      emotion: String(shot?.emotion || '').trim(),
      sensation: String(shot?.sensation || '').trim(),
    })),
  };
}

function mergeVisual(analysis, raw) {
  const anchor = String(raw?.styleAnchor || '').trim();
  const byIndex = Array.isArray(raw?.shots) ? raw.shots : [];

  const find = (shot, index) =>
    byIndex.find((s) => Number(s?.no) === shot.no) ?? byIndex[index] ?? {};

  return {
    ...analysis,
    styleAnchor: anchor,
    shots: analysis.shots.map((shot, index) => {
      const prompt = String(find(shot, index)?.prompt || '').trim();
      return {
        ...shot,
        prompt,
        fullPrompt: prompt && anchor ? `${prompt}, ${anchor}` : prompt || anchor,
      };
    }),
  };
}

/**
 * @param {string} dream 梦境原文
 * @param {object} settings 模型设置
 * @param {{signal?: AbortSignal, onStage?: (stage: string) => void, onProgress?: (chars: number) => void}} hooks
 */
export async function reframeDream(dream, settings, hooks = {}) {
  const { signal, onStage, onProgress } = hooks;
  const progress = (full) => onProgress?.(full.length);

  onStage?.('analyze');
  const analysisText = await chat({
    settings,
    signal,
    temperature: 0.85,
    messages: [
      { role: 'system', content: ANALYZE_SYSTEM },
      { role: 'user', content: analyzeUserPrompt(dream) },
    ],
    onDelta: (_delta, full) => progress(full),
  });
  const analysis = normalizeAnalysis(extractJson(analysisText));
  onStage?.('storyboard');

  onStage?.('visual');
  const visualText = await chat({
    settings,
    signal,
    temperature: 0.6,
    messages: [
      { role: 'system', content: VISUAL_SYSTEM },
      { role: 'user', content: visualUserPrompt(analysis) },
    ],
    onDelta: (_delta, full) => progress(full),
  });
  const merged = mergeVisual(analysis, extractJson(visualText));

  onStage?.('done');
  return merged;
}

/* ================================================================
 * 出图
 *
 * 出图和文字是两条独立的链路，刻意没有合并：
 *   文字链路必然要跑，出图是可选的一步——用户可能只想拿提示词去
 *   Midjourney 出图。把它做成可跳过、可单张重来的步骤，
 *   比绑成一次调用更符合真实用法。
 * ================================================================ */

export { imageConfigOf };

/**
 * 单个画面的最终提示词：
 *   画面提示词 + 风格锚点（第一步拼好）+ 正向出图约束（这里拼）。
 * 正向约束所有接口都会拼上——它写的是「要有什么」，不是「不要什么」。
 */
export function imagePromptOf(shot) {
  return composeImagePrompt(shot.fullPrompt || shot.prompt || '');
}

/** 生成单个画面的图。批量出图和「换一张」共用这一个入口。 */
export async function generateShotImage(shot, settings, { signal } = {}) {
  const cfg = imageConfigOf(settings);
  const { url } = await generateImage({
    settings,
    prompt: imagePromptOf(shot),
    // 只有支持 negative_prompt 的接口才下发；不支持的靠 IMAGE_GUARD 的正面写法兜住。
    negativePrompt: cfg?.negative ? IMAGE_NEGATIVE : '',
    size: settings.imageSize,
    signal,
  });
  return url;
}

/**
 * 逐个画面出图。
 *
 * 串行而不是并行：免费出图模型普遍有并发限制，同时发四张的结果
 * 往往是四张一起被限流。串行虽慢，但稳定拿到图。
 *
 * 单张失败不中断整批——限流和内容审核都是常态，把已经成功的那几张
 * 留下来，比整批作废有用得多。
 */
export async function renderDreamImages(result, settings, hooks = {}) {
  const { signal, onShotStart, onShotDone, onShotFail } = hooks;
  const shots = result.shots ?? [];
  const images = new Map();
  const errors = new Map();

  for (let i = 0; i < shots.length; i += 1) {
    const shot = shots[i];
    if (signal?.aborted) break;

    onShotStart?.(shot.no, i, shots.length);
    try {
      const url = await generateShotImage(shot, settings, { signal });
      images.set(shot.no, url);
      onShotDone?.(shot.no, url);
    } catch (err) {
      if (signal?.aborted) break;
      errors.set(shot.no, err);
      onShotFail?.(shot.no, err);
    }
  }

  return { images, errors };
}

/** 导出用的精简结构，去掉展示层的冗余字段。 */
export function toExport(result, dream, images = new Map()) {
  return {
    generator: 'dream-reframe',
    generatedAt: new Date().toISOString(),
    dream,
    title: result.title,
    thesis: result.thesis,
    mood: result.mood,
    motifs: result.motifs,
    styleAnchor: result.styleAnchor,
    shots: result.shots.map((s) => ({
      no: s.no,
      caption: s.caption,
      scene: s.scene,
      emotion: s.emotion,
      sensation: s.sensation,
      prompt: s.fullPrompt,
      // 出图是可选的一步，没生成的画面就不带这个字段。
      ...(images.get(s.no) ? { image: images.get(s.no) } : {}),
    })),
  };
}
