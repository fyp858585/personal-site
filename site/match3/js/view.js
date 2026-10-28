/* ============================================================
 * 渲染 + 动画层
 *
 * 引擎先把整个回合算完，这里照着「步骤流」播动画。
 * 手感的关键都在这个文件里：
 *   - 交换 115ms，跟手但不飘
 *   - 掉落按距离给时长（120~300ms），落地压扁
 *   - 消除 150ms 就开下坠，不等动画播完（不拖沓）
 *   - 新棋子从棋盘外落进来，不从天上凭空出现
 * ============================================================ */
window.View = (function () {
  'use strict';

  const W = 8, H = 8;
  const SVGNS = 'http://www.w3.org/2000/svg';

  const boardEl = document.getElementById('board');
  const cellsEl = document.getElementById('cells');
  const tilesEl = document.getElementById('tiles');
  const fxEl = document.getElementById('fx');

  let cell = 56;
  let S = null;
  let at = new Map();        // cellIndex -> el
  let selected = -1;
  let hintCells = [];

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const easeSwap = 'cubic-bezier(.32,.9,.4,1)';
  const easeFall = 'cubic-bezier(.45,.05,.7,.35)';

  // ---------------- 棋盘背景格 ----------------
  function buildCells() {
    cellsEl.innerHTML = '';
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const d = document.createElement('div');
        d.className = 'cell' + (((r + c) % 2) ? ' alt' : '');
        cellsEl.appendChild(d);
      }
    }
  }

  // ---------------- 棋子美术 ----------------
  function artContent(t) {
    const frag = document.createDocumentFragment();
    if (t.special === 'rainbow') {
      const ball = document.createElement('div');
      ball.className = 'rainbow';
      frag.appendChild(ball);
      return frag;
    }
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'board-svg');
    const use = document.createElementNS(SVGNS, 'use');
    use.setAttribute('href', '#a' + (t.color == null ? 0 : t.color));
    svg.appendChild(use);
    frag.appendChild(svg);
    if (t.special) frag.appendChild(overlaySvg(t.special));
    return frag;
  }

  function overlaySvg(special) {
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'ov');
    if (special === 'rocketH' || special === 'rocketV') {
      // 白色横带 + 深色双向箭头：不管棋子是黄是绿，都一眼能看出来
      const rot = special === 'rocketV' ? ' transform="rotate(90 50 50)"' : '';
      const d = 'M31 50 H69 M41 40 L30 50 L41 60 M59 40 L70 50 L59 60';
      svg.innerHTML =
        `<g${rot}>` +
        `<rect x="4" y="36" width="92" height="28" rx="14" fill="rgba(255,255,255,.88)"/>` +
        `<path d="${d}" fill="none" stroke="#5a3410" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>` +
        `</g>`;
    } else if (special === 'bomb') {
      svg.innerHTML =
        `<circle cx="50" cy="56" r="35.5" fill="none" stroke="rgba(50,26,8,.62)" stroke-width="6" stroke-dasharray="10 6"/>` +
        `<path d="M63 27 q14 -14 18 3" fill="none" stroke="#7a4b22" stroke-width="7" stroke-linecap="round"/>` +
        `<circle class="spark" cx="82" cy="27" r="10" fill="#ffd93b" opacity=".5"/>` +
        `<circle cx="82" cy="27" r="5" fill="#fff8c9"/>`;
    }
    return svg;
  }

  const SP_CLASSES = ['sp-rocketH', 'sp-rocketV', 'sp-bomb', 'sp-rainbow'];
  function syncSpecialClass(el, special) {
    el.classList.remove.apply(el.classList, SP_CLASSES);
    if (special) el.classList.add('sp-' + special);
  }

  function tileEl(t, r, c) {
    const el = document.createElement('div');
    el.className = 'tile';
    el.dataset.id = t.id;
    const art = document.createElement('div');
    art.className = 'art';
    art.appendChild(artContent(t));
    el.appendChild(art);
    syncSpecialClass(el, t.special);
    placeRC(el, r, c, 0);
    tilesEl.appendChild(el);
    return el;
  }

  // ---------------- 定位 ----------------
  function placeRC(el, r, c, dur, ease) {
    el.style.transition = dur ? `transform ${dur}ms ${ease || 'ease'}` : 'none';
    el.style.transform = `translate3d(${c * cell}px, ${r * cell}px, 0)`;
  }
  function placeCell(el, i, dur, ease) {
    placeRC(el, (i / W) | 0, i % W, dur, ease);
  }

  // ---------------- 挂载 / 重排 ----------------
  function mount(state) {
    S = state;
    tilesEl.innerHTML = '';
    fxEl.innerHTML = '';
    at.clear();
    selected = -1;
    for (let i = 0; i < W * H; i++) {
      const t = S.board[i];
      if (!t) continue;
      const el = tileEl(t, (i / W) | 0, i % W);
      el.classList.add('birth');
      setTimeout(() => el.classList.remove('birth'), 400);
      at.set(i, el);
    }
  }

  function layout() {
    const wrap = document.getElementById('boardWrap');
    const rect = wrap.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 40) return;
    const cs = getComputedStyle(wrap);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const availW = rect.width - padX - 8;   // 8 = 棋盘外阴影留白
    const availH = rect.height - padY - 8;
    const size = Math.floor(Math.min(availW, availH) / 8);
    const next = Math.max(28, Math.min(74, size));
    if (next === cell && at.size) return;
    cell = next;
    boardEl.style.setProperty('--cell', cell + 'px');
    for (const [i, el] of at) placeCell(el, i, 0);
  }

  // ---------------- 选中 / 提示 ----------------
  function select(i) {
    if (selected >= 0) {
      const prev = at.get(selected);
      if (prev) prev.classList.remove('sel');
    }
    selected = i;
    if (i >= 0) {
      const el = at.get(i);
      if (el) el.classList.add('sel');
    }
  }
  function getSelected() { return selected; }
  function tileElAt(i) { return at.get(i) || null; }

  function hint(pair) {
    clearHint();
    if (!pair) return;
    hintCells = [pair[0], pair[1]];
    for (const c of hintCells) {
      const el = at.get(c);
      if (el) el.classList.add('hint');
    }
  }
  function clearHint() {
    for (const c of hintCells) {
      const el = at.get(c);
      if (el) el.classList.remove('hint');
    }
    hintCells = [];
  }

  // ---------------- 特效 ----------------
  function particles(cellIndex, color, n) {
    const r = (cellIndex / W) | 0, c = cellIndex % W;
    for (let k = 0; k < n; k++) {
      const p = document.createElement('i');
      p.className = 'pt';
      p.style.left = (c * cell + cell / 2 - 4) + 'px';
      p.style.top = (r * cell + cell / 2 - 4) + 'px';
      p.style.background = color;
      const ang = Math.random() * Math.PI * 2;
      const dist = cell * (0.35 + Math.random() * 0.75);
      p.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(1) + 'px');
      p.style.setProperty('--dy', (Math.sin(ang) * dist).toFixed(1) + 'px');
      p.style.setProperty('--dur', (0.34 + Math.random() * 0.28).toFixed(2) + 's');
      fxEl.appendChild(p);
      setTimeout(() => p.remove(), 720);
    }
  }

  function ring(cellIndex, scale) {
    const r = (cellIndex / W) | 0, c = cellIndex % W;
    const size = cell * (scale || 1.8);
    const d = document.createElement('div');
    d.className = 'ring';
    d.style.width = d.style.height = size + 'px';
    d.style.left = (c * cell + cell / 2 - size / 2) + 'px';
    d.style.top = (r * cell + cell / 2 - size / 2) + 'px';
    fxEl.appendChild(d);
    setTimeout(() => d.remove(), 480);
  }

  function beam(cellIndex, dir) {
    const r = (cellIndex / W) | 0, c = cellIndex % W;
    const d = document.createElement('div');
    d.className = 'beam';
    if (dir === 'h') {
      d.style.left = '0px';
      d.style.top = (r * cell + cell * 0.3) + 'px';
      d.style.width = (cell * W) + 'px';
      d.style.height = (cell * 0.4) + 'px';
    } else {
      d.style.left = (c * cell + cell * 0.3) + 'px';
      d.style.top = '0px';
      d.style.width = (cell * 0.4) + 'px';
      d.style.height = (cell * H) + 'px';
      d.style.background = 'linear-gradient(180deg, transparent, rgba(255,250,200,.95), transparent)';
    }
    fxEl.appendChild(d);
    setTimeout(() => d.remove(), 380);
  }

  function popScore(points, cellIndex) {
    const r = (cellIndex / W) | 0, c = cellIndex % W;
    const d = document.createElement('div');
    d.className = 'pop-score';
    d.textContent = '+' + points;
    d.style.left = (c * cell + cell / 2) + 'px';
    d.style.top = (r * cell) + 'px';
    fxEl.appendChild(d);
    setTimeout(() => d.remove(), 820);
  }

  function comboText(chain) {
    const praise = chain >= 5 ? '无敌！' : chain === 4 ? '太棒了！' : chain === 3 ? '很好！' : '不错！';
    const d = document.createElement('div');
    d.className = 'combo-text lv' + Math.min(chain, 4);
    d.textContent = `${praise} ×${chain}`;
    fxEl.appendChild(d);
    setTimeout(() => d.remove(), 860);
  }

  function shake() {
    boardEl.classList.remove('shake');
    void boardEl.offsetWidth;
    boardEl.classList.add('shake');
    setTimeout(() => boardEl.classList.remove('shake'), 340);
  }
  function flash() {
    boardEl.classList.remove('flash');
    void boardEl.offsetWidth;
    boardEl.classList.add('flash');
    setTimeout(() => boardEl.classList.remove('flash'), 360);
  }

  // ---------------- 播放步骤流 ----------------
  async function play(steps, hooks) {
    hooks = hooks || {};
    // 上一轮的抖动可能还没播完，先摘掉，免得和新的位移动画打架
    for (const el of at.values()) el.classList.remove('nope');
    for (const st of steps) {
      switch (st.t) {
        case 'swap': await doSwap(st.a, st.b); break;
        case 'revert': await doRevert(st.a, st.b); break;
        case 'match': await doMatch(st); break;
        case 'spawn': doSpawn(st); break;
        case 'blast': await doBlast(st); break;
        case 'clear': await doClear(st, hooks); break;
        case 'fall': await doFall(st); break;
        case 'combo': doCombo(st); break;
        case 'shuffle': await doShuffle(st); break;
        default: break;
      }
    }
  }

  async function doSwap(a, b) {
    const ea = at.get(a), eb = at.get(b);
    if (!ea || !eb) return;
    at.set(a, eb); at.set(b, ea);
    ea.style.zIndex = 5;
    placeCell(ea, b, 115, easeSwap);
    placeCell(eb, a, 115, easeSwap);
    await wait(118);
    ea.style.zIndex = '';
  }

  async function doRevert(a, b) {
    const ea = at.get(a), eb = at.get(b);
    if (!ea || !eb) return;
    at.set(a, eb); at.set(b, ea);
    placeCell(ea, b, 145, easeSwap);
    placeCell(eb, a, 145, easeSwap);
    SFX.invalid();
    await wait(150);
    // 抖动只是反馈，不锁输入：150ms 就放行，抖动画自己在后台播完
    ea.classList.add('nope');
    eb.classList.add('nope');
    setTimeout(() => { ea.classList.remove('nope'); eb.classList.remove('nope'); }, 340);
  }

  async function doMatch(st) {
    const seen = new Set();
    for (const g of st.groups) for (const c of g.cells) seen.add(c);
    for (const c of seen) {
      const el = at.get(c);
      if (el) el.classList.add('hit');
    }
    if (st.chain > 1) {
      comboText(st.chain);
      SFX.combo(st.chain);
    }
    await wait(st.chain > 1 ? 120 : 75);
  }

  function doSpawn(st) {
    const el = at.get(st.cell);
    if (!el) return;
    const art = el.querySelector('.art');
    art.innerHTML = '';
    art.appendChild(artContent({ color: st.color, special: st.special }));
    syncSpecialClass(el, st.special);
    el.classList.remove('hit');
    el.classList.add('birth');
    setTimeout(() => el.classList.remove('birth'), 400);
    ring(st.cell, 1.7);
    SFX.spawn();
  }

  async function doBlast(st) {
    if (st.special === 'rocketH' || st.special === 'rocketV') {
      beam(st.source, st.special === 'rocketH' ? 'h' : 'v');
      SFX.rocket();
      shake();
      await wait(170);
    } else if (st.special === 'bomb') {
      ring(st.source, 2.8);
      SFX.bomb();
      shake();
      await wait(190);
    } else {
      flash();
      SFX.rainbow();
      await wait(230);
    }
  }

  async function doClear(st, hooks) {
    for (const c of st.cells) {
      const el = at.get(c.i);
      if (!el) continue;
      el.classList.remove('hit');
      el.classList.add('pop');
      const dead = el;
      setTimeout(() => dead.remove(), 230);
      at.delete(c.i);
      if (c.color != null) particles(c.i, M3.COLORS[c.color], 5);
    }
    if (st.cells.length) {
      popScore(st.points, st.cells[0].i);
      SFX.pop(st.chain);
    }
    if (hooks.onClear) hooks.onClear(st);
    await wait(150);
  }

  function landLater(el, dur) {
    setTimeout(() => {
      el.classList.add('land');
      setTimeout(() => el.classList.remove('land'), 200);
    }, dur);
  }

  async function doFall(st) {
    let maxDur = 0;
    for (const m of st.moves) {
      const el = at.get(m.from);
      if (!el) continue;
      at.delete(m.from);
      at.set(m.to, el);
      const fromR = (m.from / W) | 0, toR = (m.to / W) | 0;
      const dist = toR - fromR;
      const dur = Math.max(120, Math.min(300, 120 + dist * 26));
      placeCell(el, m.to, dur, easeFall);
      landLater(el, dur);
      maxDur = Math.max(maxDur, dur);
    }

    // 新棋子：从棋盘上边缘之外落进来
    const byCol = new Map();
    for (const s of st.spawns) {
      const c = s.to % W;
      if (!byCol.has(c)) byCol.set(c, []);
      byCol.get(c).push(s);
    }
    for (const [c, list] of byCol) {
      list.sort((x, y) => ((x.to / W) | 0) - ((y.to / W) | 0));
      const k = list.length;
      list.forEach((s, j) => {
        const r = (s.to / W) | 0;
        const startR = j - k;
        const el = tileEl({ id: s.id, color: s.color, special: null }, startR, c);
        at.set(s.to, el);
        // 强制回流：确保「棋盘外」这个起点先被浏览器认下来，否则不会有下落动画
        void el.offsetWidth;
        const dist = r - startR;
        const dur = Math.max(140, Math.min(340, 130 + dist * 28));
        placeRC(el, r, c, dur, easeFall);
        landLater(el, dur);
        maxDur = Math.max(maxDur, dur);
      });
    }
    if (maxDur) await wait(maxDur + 30);
  }

  function doCombo(st) {
    const d = document.createElement('div');
    d.className = 'combo-text lv4';
    d.style.top = '46%';
    d.textContent = st.text;
    fxEl.appendChild(d);
    setTimeout(() => d.remove(), 900);
    // 音效 / 闪光交给紧随其后的 blast 步骤，免得两声叠在一起
  }

  async function doShuffle(st) {
    if (window.Game && Game.toast) Game.toast(st.text || '重新排列', 1600);
    SFX.shake();
    for (const el of at.values()) el.classList.add('pop');
    await wait(190);
    for (const a of st.assign) {
      let el = null;
      for (const cand of at.values()) if (+cand.dataset.id === a.id) { el = cand; break; }
      if (!el) continue;
      const art = el.querySelector('.art');
      art.innerHTML = '';
      art.appendChild(artContent({ color: a.color, special: a.special || null }));
      syncSpecialClass(el, a.special || null);
      el.classList.remove('pop');
      el.classList.add('birth');
      setTimeout(() => el.classList.remove('birth'), 380);
    }
    await wait(300);
  }

  // ---------------- 对外 ----------------
  return {
    buildCells, mount, layout, play,
    select, getSelected, hint, clearHint, tileElAt,
    shake, flash, comboText,
    get cell() { return cell; },
  };
})();
