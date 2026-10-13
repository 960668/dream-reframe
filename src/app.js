/**
 * 应用入口：串联设置、输入、链路与渲染。
 */
import { PROVIDERS, REPO_URL, STORAGE_KEY } from './config.js';
import { describeError, isConfigured, loadSettings, saveSettings } from './llm.js';
import { reframeDream, toExport } from './pipeline.js';
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
} from './render.js';

const $ = (id) => document.getElementById(id);

let settings = loadSettings();
let controller = null;
let lastResult = null;

/* ---------- 设置 ---------- */

function fillProviders() {
  const select = $('provider');
  select.replaceChildren(
    ...PROVIDERS.map((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      return opt;
    }),
  );
}

function applyProvider(id, { overwriteFields }) {
  const provider = PROVIDERS.find((p) => p.id === id);
  if (!provider) return;
  if (overwriteFields) {
    $('baseURL').value = provider.baseURL;
    $('model').value = provider.model;
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
}

function paintSettings() {
  $('provider').value = settings.providerId;
  $('baseURL').value = settings.baseURL;
  $('model').value = settings.model;
  $('apiKey').value = settings.apiKey;
  $('useProxy').checked = Boolean(settings.useProxy);

  const state = $('settingsState');
  const ready = isConfigured(settings);
  state.textContent = ready ? `已配置 · ${settings.model}` : '未配置';
  state.dataset.ready = ready ? 'yes' : 'no';
  $('settings').open = !ready;
}

function readForm() {
  const providerId = $('provider').value;
  return {
    providerId,
    baseURL: $('baseURL').value.trim(),
    model: $('model').value.trim(),
    apiKey: $('apiKey').value.trim(),
    useProxy: $('useProxy').checked,
  };
}

/* ---------- 运行 ---------- */

function setBusy(busy) {
  $('runBtn').disabled = busy;
  $('demoBtn').disabled = busy;
  $('stopBtn').hidden = !busy;
}

async function run(dream) {
  hideError();
  controller = new AbortController();
  setBusy(true);
  resetSteps();
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
    renderResult(result, { demo: false });
    setStatus('完成 · 可以复制提示词去生成画面了');
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

  $('stopBtn').addEventListener('click', () => controller?.abort());
  $('retryBtn').addEventListener('click', () => {
    const dream = $('dreamInput').value.trim();
    if (dream) run(dream);
  });

  $('demoBtn').addEventListener('click', () => {
    lastResult = DEMO_SAMPLE;
    hideError();
    renderResult(DEMO_SAMPLE, { demo: true });
    ['analyze', 'storyboard', 'visual'].forEach((s) => setStep(s, 'done'));
    setStatus('这是内置的示例数据，配置好模型后即为真实生成');
  });

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
    const data = toExport(lastResult, $('dreamInput').value.trim());
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
  });

  $('apiKey').addEventListener('change', () => {
    $('settingsState').textContent = $('apiKey').value.trim() ? '待保存' : '未配置';
  });
}

/* ---------- 启动 ---------- */

fillProviders();
bind();
applyProvider(settings.providerId, { overwriteFields: false });
paintSettings();

if (REPO_URL) {
  $('repoLink').href = REPO_URL;
} else {
  $('repoLink').hidden = true;
}

// 首次访问时给输入框放一段引导文案，方便直接点「看示例效果」
void STORAGE_KEY;
