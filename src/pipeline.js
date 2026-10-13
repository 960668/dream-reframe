/**
 * 两段式链路：
 *   1) 解析梦境 + 编排画面  —— 合并为一次调用，省一次往返
 *   2) 生成视觉提示词        —— 依赖第 1 步的结构化结果
 *
 * 合并第 1、2 步是一个刻意的取舍：解析和编排共享同一份上下文，
 * 拆成两次调用只会多付一次延迟和一次输入 token，换不到质量提升。
 *
 * 画面字段用 sensation（身体感）而不是 camera（运镜）：
 * 刻意避开电影语法，因为梦的记忆单位是「画面 + 身体感」，不是「镜头」。
 * 视角与构图交给第二段按画面内容决定。
 */
import { chat, extractJson } from './llm.js';
import {
  ANALYZE_SYSTEM,
  analyzeUserPrompt,
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
  let received = 0;
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
  received = 0;

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
  void received;

  onStage?.('done');
  return merged;
}

/** 导出用的精简结构，去掉展示层的冗余字段。 */
export function toExport(result, dream) {
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
    })),
  };
}
