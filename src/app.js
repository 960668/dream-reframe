/**
 * 应用入口：串联设置、输入、链路与渲染。
 *
 * 这里只做编排，不做业务：提示词在 prompts.js，请求在 llm.js / image.js，
 * DOM 在 render.js。想调模型行为，不用打开这个文件。
 */
import { DEFAULT_IMAGE_SIZE, PROVIDERS, REPO_URL, SIZE_KEYS } from './config.js';
import { describeError, isConfigured, loadSettings, saveSettings } from './llm.js';
import { describeImageError, imageConfigOf, isImageReady } from './image.js';
import { generateShotImage, reframeDream, renderDreamImages, toExport } from './pipeline.js';
import { DEMO_SAMPLE, SAMPLE_DREAMS } from './sample.js';
import {
  copyText,
  hideError,
  renderResult,
  renderSkeleton,
  resetSteps,
  setStatus,
  setStep,
  showError,
  updateShotMedia,
} from './render.js';

const $ = (id) => document.getElementById(id);

let settings = loadSettings();
let controller = null;
let imageController = null;
let lastResult = null;
/** 画面号 → 图片区元素，出图时用来定位该更新哪一块 */
let mediaByNo = new Map();
/** 画面号 → 已生成的图片地址，导出时带上 */
let imageUrls = new Map();

/* ---------- 设置 ---------- */

function providerOf(id) {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

function fillProviders() {
  $('provider').replaceChildren(
    ...PROVIDERS.map((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      return opt;
    }),
  );

  $('sizeKey').replaceChildren(
    ...SIZE_KEYS.map((k) => {
      const opt = document.createElement('option');
      opt.value = k.id;
      opt.textContent = k.label;
      return opt;
    }),
  );
}

/** 尺寸下拉只列服务商确定支持的取值——填错会被接口直接拒绝。 */
function fillSizes(preset, keep) {
  const list = preset?.length ? preset : [DEFAULT_IMAGE_SIZE];
  $('imageSize').replaceChildren(
    ...list.map((size) => {
      const opt = document.createElement('option');
      opt.value = size;
      opt.textContent = size;
      return opt;
    }),
  );
  $('imageSize').value = list.includes(keep) ? keep : list[0];
}

function applyProvider(id, { overwriteFields }) {
  const provider = providerOf(id);
  if (overwriteFields) {
    $('baseURL').value = provider.baseURL;
    $('model').value = provider.model;
    $('imageModel').value = '';
    $('sizeKey').value = provider.image?.sizeKey || 'size';
    fillSizes(provider.image?.sizePreset, settings.imageSize);
  }

  const help = $('keyHelp');
  if (provider.keyHelp) {
    help.href = provider.keyHelp;
    help.hidden = false;
  } else {
    help.hidden = true;
  }

  // cors 为 false 时，浏览器直连一定失败。提前说清楚，比让用户撞一次错误好。
  const hint = $('providerHint');
  if (provider.cors === false) {
    hint.textContent = '这个服务商不允许浏览器直连。本机运行时可勾选下面的本地代理；如果用的是 GitHub Pages 这类静态托管，没有代理，请换一个服务商。';
    hint.hidden = false;
  } else {
    hint.hidden = true;
  }

  // 出图侧：没有图像接口的服务商，把输入框关掉并说明原因，避免用户白填。
  const img = provider.image;
  $('imageModel').disabled = !img;
  $('imageModel').placeholder = img?.model || '这个服务商没有出图接口';
  $('imageSize').disabled = !img;
  $('sizeKey').disabled = !img;

  const imageHint = $('imageHint');
  if (!img) {
    imageHint.textContent = '这个服务商只有对话接口，不能出图。文字链路照常可用，提示词可以复制到任意文生图工具；想在本页直接出图，请换成「智谱 GLM」或「硅基流动」——两家的出图模型都是免费的。';
    imageHint.hidden = false;
  } else if (provider.cors === false) {
    imageHint.textContent = '注意：这个服务商不允许浏览器直连，出图同样需要勾选本地代理（本机运行时可用）。';
    imageHint.hidden = false;
  } else {
    imageHint.hidden = true;
  }
}

function paintSettings() {
  $('provider').value = settings.providerId;
  $('baseURL').value = settings.baseURL;
  $('model').value = settings.model;
  $('apiKey').value = settings.apiKey;
  $('useProxy').checked = Boolean(settings.useProxy);
  $('imageModel').value = settings.imageModel ?? '';
  $('sizeKey').value = settings.sizeKey || imageConfigOf(settings)?.sizeKey || 'size';
  $('autoImage').checked = settings.autoImage !== false;

  const state = $('settingsState');
  const ready = isConfigured(settings);
  state.textContent = ready ? `已配置 · ${settings.model}` : '未配置';
  state.dataset.ready = ready ? 'yes' : 'no';
  $('settings').open = !ready;
}

function readForm() {
  return {
    providerId: $('provider').value,
    baseURL: $('baseURL').value.trim(),
    model: $('model').value.trim(),
    apiKey: $('apiKey').value.trim(),
    useProxy: $('useProxy').checked,
    imageModel: $('imageModel').value.trim(),
    imageSize: $('imageSize').value || DEFAULT_IMAGE_SIZE,
    sizeKey: $('sizeKey').value,
    autoImage: $('autoImage').checked,
  };
}

/* ---------- 运行 ---------- */

function setBusy(busy) {
  $('runBtn').disabled = busy;
  $('demoBtn').disabled = busy;
  $('stopBtn').hidden = !busy;
}

function captionOf(no) {
  return lastResult?.shots?.find((s) => s.no === no)?.caption || `画面 ${no}`;
}

const IMAGE_OFF_HINT = '当前服务商没有出图接口。提示词可以直接复制到任意文生图工具使用。';

/**
 * 出图阶段。
 * 三种情况分开处理，而不是一律出图：没有出图能力 / 用户关了自动出图 / 正常出图。
 * 前两种都要给一个明确的落点，不能让用户以为卡住了。
 */
async function runImages(result, media, signal) {
  const total = result.shots.length;

  if (!isImageReady(settings)) {
    media.forEach((el) => updateShotMedia(el, { state: 'off', message: IMAGE_OFF_HINT }));
    setStatus('完成 · 提示词可以直接拿去文生图工具使用');
    return;
  }

  if (settings.autoImage === false) {
    media.forEach((el) => updateShotMedia(el, { state: 'idle' }));
    setStatus('完成 · 点每个画面里的「生成这张」逐个出图，或一次生成全部');
    return;
  }

  setStep('image', 'active');
  await renderDreamImages(result, settings, {
    signal,
    onShotStart: (no, index) => {
      setStatus(`正在出图 ${index + 1}/${total}…（免费模型每张通常十几秒）`);
      updateShotMedia(media.get(no), { state: 'loading' });
    },
    onShotDone: (no, url) => {
      imageUrls.set(no, url);
      updateShotMedia(media.get(no), { state: 'done', url, caption: captionOf(no) });
    },
    onShotFail: (no, err) => {
      updateShotMedia(media.get(no), { state: 'error', message: describeImageError(err, settings) });
    },
  });

  const ok = imageUrls.size;
  setStep('image', ok > 0 ? 'done' : 'idle');
  setStatus(
    ok === total
      ? `完成 · ${total} 个画面全部生成`
      : `完成 · ${ok}/${total} 张成功，失败的可以单独重试`,
  );
}

async function run(dream) {
  hideError();
  controller = new AbortController();
  setBusy(true);
  resetSteps();
  imageUrls = new Map();
  mediaByNo = new Map();
  renderSkeleton();
  setStatus('正在重构…');

  try {
    const result = await reframeDream(dream, settings, {
      signal: controller.signal,
      onStage: (stage) => {
        if (stage === 'analyze') setStep('analyze', 'active');
        if (stage === 'storyboard') {
          setStep('analyze', 'done');
          setStep('storyboard', 'done');
        }
        if (stage === 'visual') {
          setStep('analyze', 'done');
          setStep('storyboard', 'done');
          setStep('visual', 'active');
        }
        if (stage === 'done') {
          ['analyze', 'storyboard', 'visual'].forEach((s) => setStep(s, 'done'));
        }
      },
      onProgress: (chars) => setStatus(`正在重构… 已接收 ${chars} 字`),
    });

    lastResult = result;
    const { media } = renderResult(result, { demo: false, onGenerateShot: handleGenerateShot });
    mediaByNo = media;

    await runImages(result, media, controller.signal);
  } catch (err) {
    if (err?.name === 'AbortError') {
      setStatus('已停止');
      $('result').hidden = true;
      return;
    }
    showError(describeError(err, settings));
    setStatus('');
    $('result').hidden = true;
  } finally {
    setBusy(false);
    controller = null;
  }
}

/** 单张重新生成。与批量出图共用 pipeline 里的同一个函数，行为一致。 */
async function handleGenerateShot(shot) {
  if (!isImageReady(settings)) {
    $('settings').open = true;
    showError('要先在「模型设置 → 出图」里选一个带出图能力的服务商（智谱或硅基流动，出图免费）并填好 API Key。');
    return;
  }

  const el = mediaByNo.get(shot.no);
  imageController = new AbortController();
  updateShotMedia(el, { state: 'loading', message: '正在重新生成这一张…' });
  setStatus(`正在重新生成画面 ${shot.no}…`);

  try {
    const url = await generateShotImage(shot, settings, { signal: imageController.signal });
    imageUrls.set(shot.no, url);
    updateShotMedia(el, { state: 'done', url, caption: shot.caption });
    setStatus('这一张换好了');
  } catch (err) {
    updateShotMedia(el, { state: 'error', message: describeImageError(err, settings) });
    setStatus('');
  } finally {
    imageController = null;
  }
}

/** 「生成全部画面」：跳过已经生成的，只补缺的那些。 */
async function generateMissing() {
  if (!lastResult || !mediaByNo.size) return;
  if (!isImageReady(settings)) {
    $('settings').open = true;
    showError('要先在「模型设置 → 出图」里选一个带出图能力的服务商并填好 API Key。');
    return;
  }

  const pending = lastResult.shots.filter((s) => !imageUrls.has(s.no));
  if (pending.length === 0) {
    setStatus('所有画面都已经生成过了。想换掉某一张，点它下面的「换一张」。');
    return;
  }

  setBusy(true);
  imageController = new AbortController();
  setStep('image', 'active');

  try {
    await renderDreamImages({ shots: pending }, settings, {
      signal: imageController.signal,
      onShotStart: (no, index) => {
        setStatus(`正在出图 ${index + 1}/${pending.length}…`);
        updateShotMedia(mediaByNo.get(no), { state: 'loading' });
      },
      onShotDone: (no, url) => {
        imageUrls.set(no, url);
        updateShotMedia(mediaByNo.get(no), { state: 'done', url, caption: captionOf(no) });
      },
      onShotFail: (no, err) => {
        updateShotMedia(mediaByNo.get(no), { state: 'error', message: describeImageError(err, settings) });
      },
    });
    setStep('image', 'done');
    setStatus(`完成 · 共 ${imageUrls.size}/${lastResult.shots.length} 张`);
  } catch (err) {
    if (err?.name !== 'AbortError') setStatus('');
  } finally {
    setBusy(false);
    imageController = null;
  }
}

/* ---------- 事件绑定 ---------- */

function bind() {
  document.querySelectorAll('[data-sample]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dream = SAMPLE_DREAMS[Number(btn.dataset.sample)];
      if (dream) {
        $('dreamInput').value = dream.trim();
        $('dreamInput').focus();
      }
    });
  });

  $('provider').addEventListener('change', (e) => {
    applyProvider(e.target.value, { overwriteFields: true });
  });

  $('saveSettings').addEventListener('click', () => {
    settings = readForm();
    saveSettings(settings);
    paintSettings();
    applyProvider(settings.providerId, { overwriteFields: false });
    setStatus(settings.apiKey ? '设置已保存' : '设置已保存，但还缺少 API Key');
  });

  $('runBtn').addEventListener('click', () => {
    const dream = $('dreamInput').value.trim();
    if (dream.length < 8) {
      showError('梦有点太短了，多写几句吧。哪怕只是几个画面也行。');
      return;
    }
    if (!isConfigured(settings)) {
      $('settings').open = true;
      showError('还没配置模型。填好服务商、接口地址、模型名和 API Key，保存后再试；或者先点「看示例效果」。');
      return;
    }
    run(dream);
  });

  $('stopBtn').addEventListener('click', () => {
    controller?.abort();
    imageController?.abort();
  });

  $('retryBtn').addEventListener('click', () => {
    const dream = $('dreamInput').value.trim();
    if (dream) run(dream);
  });

  $('demoBtn').addEventListener('click', () => {
    lastResult = DEMO_SAMPLE;
    imageUrls = new Map();
    hideError();
    const { media } = renderResult(DEMO_SAMPLE, { demo: true });
    mediaByNo = media;
    ['analyze', 'storyboard', 'visual', 'image'].forEach((s) => setStep(s, 'done'));
    setStatus('这是内置的示例数据，配置好模型后即为真实生成');
  });

  $('imageAllBtn').addEventListener('click', generateMissing);

  $('stylePanel').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy="styleAnchor"]');
    if (!btn) return;
    await copyText($('styleAnchor').textContent);
    btn.textContent = '已复制';
    setTimeout(() => { btn.textContent = '复制'; }, 1500);
  });

  $('copyAll').addEventListener('click', async (e) => {
    if (!lastResult) return;
    const text = lastResult.shots.map((s) => `#${s.no} ${s.caption}\n${s.fullPrompt}`).join('\n\n');
    await copyText(text);
    e.target.textContent = '已复制';
    setTimeout(() => { e.target.textContent = '复制全部提示词'; }, 1500);
  });

  $('downloadJson').addEventListener('click', () => {
    if (!lastResult) return;
    const data = toExport(lastResult, $('dreamInput').value.trim(), imageUrls);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lastResult.title || 'dream'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  $('resetBtn').addEventListener('click', () => {
    $('result').hidden = true;
    resetSteps();
    setStatus('');
    hideError();
    $('dreamInput').value = '';
    $('dreamInput').focus();
    imageUrls = new Map();
    mediaByNo = new Map();
  });

  $('apiKey').addEventListener('change', () => {
    $('settingsState').textContent = $('apiKey').value.trim() ? '待保存' : '未配置';
  });
}

/* ---------- 启动 ---------- */

fillProviders();
bind();
applyProvider(settings.providerId, { overwriteFields: false });
fillSizes(imageConfigOf(settings)?.sizePreset, settings.imageSize);
paintSettings();

if (REPO_URL) {
  $('repoLink').href = REPO_URL;
} else {
  $('repoLink').hidden = true;
}
