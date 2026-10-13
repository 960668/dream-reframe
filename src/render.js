/**
 * 渲染层：只负责把结果画出来。
 * 全部用 DOM API 创建节点，模型输出一律走 textContent，不拼 HTML 字符串。
 */

const $ = (id) => document.getElementById(id);

export function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    resolve();
  });
}

function chip(text, className) {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

function shotCard(shot, index) {
  const card = document.createElement('article');
  card.className = 'shot';

  const head = document.createElement('div');
  head.className = 'shot-head';

  const no = document.createElement('span');
  no.className = 'shot-no';
  no.textContent = String(shot.no ?? index + 1).padStart(2, '0');

  const caption = document.createElement('span');
  caption.className = 'shot-caption';
  caption.textContent = shot.caption;

  head.append(no, caption);

  if (shot.emotion) {
    const emo = document.createElement('span');
    emo.className = 'shot-emotion';
    emo.textContent = shot.emotion;
    head.appendChild(emo);
  }

  card.appendChild(head);

  if (shot.scene) {
    const scene = document.createElement('p');
    scene.className = 'shot-scene';
    scene.textContent = shot.scene;
    card.appendChild(scene);
  }

  if (shot.sensation) {
    const sens = document.createElement('p');
    sens.className = 'shot-sensation';

    const label = document.createElement('span');
    label.className = 'shot-sensation-label';
    label.textContent = '身体感';

    const text = document.createElement('span');
    text.textContent = shot.sensation;

    sens.append(label, text);
    card.appendChild(sens);
  }

  if (shot.fullPrompt) {
    const promptHead = document.createElement('div');
    promptHead.className = 'shot-prompt-head';

    const label = document.createElement('span');
    label.className = 'shot-prompt-label';
    label.textContent = '文生图提示词';

    const btn = document.createElement('button');
    btn.className = 'btn-copy';
    btn.type = 'button';
    btn.textContent = '复制';
    btn.addEventListener('click', async () => {
      await copyText(shot.fullPrompt);
      btn.textContent = '已复制';
      setTimeout(() => { btn.textContent = '复制'; }, 1500);
    });

    promptHead.append(label, btn);

    const pre = document.createElement('pre');
    pre.className = 'code';
    pre.textContent = shot.fullPrompt;

    card.append(promptHead, pre);
  }

  // 示例流程专属：仓库里预置的成片图，证明这条提示词真的能出这个画面。
  // 真实模型输出没有这个字段，自然不会显示。
  if (shot.demoImage) {
    const figure = document.createElement('figure');
    figure.className = 'shot-demo-figure';

    const img = document.createElement('img');
    img.src = shot.demoImage;
    img.alt = `${shot.caption || '画面'} 的示例成片`;
    img.loading = 'lazy';

    const figcaption = document.createElement('figcaption');
    figcaption.textContent = '示例成片 · 由上方这条提示词生成';

    figure.append(img, figcaption);
    card.appendChild(figure);
  }

  return card;
}

export function renderResult(result, { demo = false } = {}) {
  $('dreamTitle').textContent = result.title;
  $('dreamThesis').textContent = result.thesis;

  const moodBox = $('dreamMood');
  moodBox.replaceChildren(...(result.mood ?? []).map((m) => chip(m, 'chip')));

  const motifBox = $('dreamMotifs');
  motifBox.replaceChildren(...(result.motifs ?? []).map((m) => chip(m, 'chip chip-motif')));

  $('demoBadge').hidden = !demo;

  const stylePanel = $('stylePanel');
  if (result.styleAnchor) {
    $('styleAnchor').textContent = result.styleAnchor;
    stylePanel.hidden = false;
  } else {
    stylePanel.hidden = true;
  }

  const shots = result.shots ?? [];
  $('shots').replaceChildren(...shots.map(shotCard));
  $('shotCount').textContent = `${shots.length} 个画面`;

  const box = $('result');
  box.hidden = false;
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function renderSkeleton() {
  const box = $('shots');
  const placeholder = document.createElement('div');
  placeholder.innerHTML =
    '<div class="skeleton w-40"></div><div class="skeleton w-95"></div><div class="skeleton w-70"></div>';
  const second = placeholder.cloneNode(true);
  const third = placeholder.cloneNode(true);
  box.replaceChildren(placeholder, second, third);
  $('shotCount').textContent = '';
  $('result').hidden = false;
}

export function setStep(step, state) {
  const el = document.querySelector(`.steps li[data-step="${step}"]`);
  if (el) el.dataset.state = state;
}

export function resetSteps() {
  document.querySelectorAll('.steps li').forEach((li) => { li.dataset.state = ''; });
}

export function showError(message) {
  $('errorText').textContent = message;
  $('errorBox').hidden = false;
  $('errorBox').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function hideError() {
  $('errorBox').hidden = true;
}

export function setStatus(text) {
  $('status').textContent = text;
}
