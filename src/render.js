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

/* ---------- 画面图片位 ---------- */

/**
 * 一个画面卡里的图片区。
 *
 * 状态由外部驱动（app.js 才知道出图跑到哪了），这里只提供两个方法：
 *   createShotMedia  造出这个区域
 *   updateShotMedia  把它切到某个状态
 * 分开是为了让「生成中 / 成功 / 失败 / 未生成」四种状态用同一套 DOM 更新，
 * 不必在业务代码里拼节点。
 */
function createShotMedia(shot, { onGenerate } = {}) {
  const media = document.createElement('div');
  media.className = 'shot-media';

  const frame = document.createElement('div');
  frame.className = 'shot-media-frame';

  const bar = document.createElement('div');
  bar.className = 'shot-media-bar';

  const state = document.createElement('span');
  state.className = 'shot-media-state';

  const btn = document.createElement('button');
  btn.className = 'btn-copy shot-media-btn';
  btn.type = 'button';
  btn.addEventListener('click', () => onGenerate?.(shot, media));

  bar.append(state, btn);
  media.append(frame, bar);

  updateShotMedia(media, { state: 'idle' });
  return media;
}

/** 把图片区切到指定状态。state: idle | loading | done | error | off */
export function updateShotMedia(media, opts = {}) {
  const { state = 'idle', url = '', message = '', caption = '', actionEnabled = true } = opts;
  if (!media) return;

  media.dataset.state = state;
  const frame = media.querySelector('.shot-media-frame');
  const label = media.querySelector('.shot-media-state');
  const btn = media.querySelector('.shot-media-btn');
  frame.replaceChildren();

  if (state === 'loading') {
    const wrap = document.createElement('div');
    wrap.className = 'shot-media-loading';
    const dot = document.createElement('span');
    dot.className = 'spinner';
    const text = document.createElement('span');
    text.textContent = message || '正在出图，免费模型通常要十几秒…';
    wrap.append(dot, text);
    frame.appendChild(wrap);
    label.textContent = '生成中';
    btn.hidden = true;
    return;
  }

  if (state === 'done') {
    const img = document.createElement('img');
    img.src = url;
    img.alt = caption || '生成的画面';
    img.loading = 'lazy';

    const open = document.createElement('a');
    open.className = 'shot-media-open';
    open.href = url;
    open.target = '_blank';
    open.rel = 'noopener';
    open.textContent = '查看原图 ↗';

    frame.append(img, open);
    label.textContent = '已生成';
    btn.hidden = !actionEnabled;
    btn.disabled = !actionEnabled;
    btn.textContent = '换一张';
    return;
  }

  if (state === 'error') {
    const p = document.createElement('p');
    p.className = 'shot-media-note is-error';
    p.textContent = message || '这张没生成出来。';
    frame.appendChild(p);
    label.textContent = '失败';
    btn.hidden = false;
    btn.disabled = false;
    btn.textContent = '重试';
    return;
  }

  if (state === 'off') {
    const p = document.createElement('p');
    p.className = 'shot-media-note';
    p.textContent = message || '这个服务商没有出图接口。提示词可以直接拿去别处生成。';
    frame.appendChild(p);
    label.textContent = '不出图';
    btn.hidden = true;
    return;
  }

  const p = document.createElement('p');
  p.className = 'shot-media-note';
  p.textContent = message || '这个画面还没有生成图片';
  frame.appendChild(p);
  label.textContent = '未生成';
  btn.hidden = false;
  btn.disabled = false;
  btn.textContent = '生成这张';
}

function shotCard(shot, index, handlers) {
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

  const media = createShotMedia(shot, handlers);
  card.appendChild(media);

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

  return { card, media, shot };
}

/**
 * 画结果区。
 * @returns {{media: Map<number, HTMLElement>}} 供 app.js 驱动出图状态
 */
export function renderResult(result, { demo = false, onGenerateShot } = {}) {
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
  const built = shots.map((shot, i) => shotCard(shot, i, { onGenerate: onGenerateShot }));
  $('shots').replaceChildren(...built.map((b) => b.card));
  $('shotCount').textContent = `${shots.length} 个画面`;

  const media = new Map(built.map((b) => [b.shot.no, b.media]));

  // 示例流程：仓库里预置的成片图，证明这条提示词真的能出这个画面。
  // 置为 done 且禁用按钮——示例图是固定的，重生成没有意义。
  if (demo) {
    built.forEach(({ shot, media: el }) => {
      if (shot.demoImage) {
        updateShotMedia(el, {
          state: 'done',
          url: shot.demoImage,
          caption: `${shot.caption} 的示例成片`,
          actionEnabled: false,
        });
        el.querySelector('.shot-media-state').textContent = '示例成片';
      } else {
        updateShotMedia(el, { state: 'off', message: '示例数据只配了两张成片。真实运行时会为每个画面出图。' });
      }
    });
  }

  const box = $('result');
  box.hidden = false;
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return { media };
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
