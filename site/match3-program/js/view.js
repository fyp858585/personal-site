/* ============================================================
 * 编程三消 · 渲染 / 动画层
 *
 * 与 ../basic/js/view.js 同一套手感参数：
 *   交换 115ms / 消除 150ms 就开下坠 / 掉落 120~300ms / 落地压扁
 * 这一版多做了三件事：
 *   1. 冰面图层（消除后融化，独立于棋子）
 *   2. 特殊棋子右上角的「规则编号」徽章 —— 一眼看出它是哪条规则生的
 *   3. 规则触发时在棋盘上飘一个「② 炸弹」标签
 * ============================================================ */
window.View = (function () {
  'use strict';

  const W = 8, H = 8;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const CN = ['①', '②', '③', '④'];
  const RULE_COLORS = ['#6ea8fe', '#ffc93c', '#c084fc', '#4ade80'];

  const boardEl = document.getElementById('board');
  const cellsEl = document.getElementById('cells');
  const tilesEl = document.getElementById('tiles');
  const iceLayer = document.getElementById('ice');
  const fxEl = document.getElementById('fx');

  let cell = 56;
  let S = null;
  let at = new Map();          // cellIndex -> tile el
  let iceEls = new Map();      // cellIndex -> ice el
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

  // 特殊棋子右上角：这条规则是几号
  function syncBadge(el, origin) {
    let b = el.querySelector('.rule-badge');
    if (origin == null || origin < 0) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('i');
      b.className = 'rule-badge';
      el.appendChild(b);
    }
    b.textContent = CN[origin] || String(origin + 1);
    b.style.background = RULE_COLORS[origin] || '#fff';
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
    syncBadge(el, t.origin);
    placeRC(el, r, c, 0);
    tilesEl.appendChild(el);
    return el;
  }

  // ---------------- 冰面 ----------------
  function iceElAt(i) {
    const r = (i / W) | 0, c = i % W;
    const el = document.createElement('div');
    el.className = 'ice';
    placeRC(el, r, c, 0);
    iceLayer.appendChild(el);
    return el;
  }

  function buildIce() {
    iceLayer.innerHTML = '';
    iceEls.clear();
    if (!S || !S.ice) return;
    for (let i = 0; i < W * H; i++) {
      if (S.ice[i] > 0) iceEls.set(i, iceElAt(i));
    }
  }

  function meltIce(cells) {
    for (const c of cells) {
      const el = iceEls.get(c);
      if (!el) continue;
      el.classList.add('melt');
      iceEls.delete(c);
      setTimeout(() => el.remove(), 460);
    }
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
    buildIce();
  }

  function layout() {
    const wrap = document.getElementById('boardWrap');
    const rect = wrap.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 40) return;
    const cs = getComputedStyle(wrap);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    // 棋盘自己的木框也要算进去，否则 --cell*8 会撑出容器
    const boardPad = parseFloat(getComputedStyle(boardEl).getPropertyValue('--pad')) || 13;
    const availW = rect.width - padX - boardPad * 2 - 2;
    const availH = rect.height - padY - boardPad * 2 - 2;
    const size = Math.floor(Math.min(availW, availH) / 8);
    const next = Math.max(28, Math.min(74, size));
    if (next === cell && at.size) return;
    cell = next;
    boardEl.style.setProperty('--cell', cell + 'px');
    for (const [i, el] of at) placeCell(el, i, 0);
    for (const [i, el] of iceEls) placeCell(el, i, 0);
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
  function particles(index, color, n) {
    const r = (index / W) | 0, c = index % W;
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

  function ring(index, scale) {
    const r = (index / W) | 0, c = index % W;
    const size = cell * (scale || 1.8);
    const d = document.createElement('div');
    d.className = 'ring';
    d.style.width = d.style.height = size + 'px';
    d.style.left = (c * cell + cell / 2 - size / 2) + 'px';
    d.style.top = (r * cell + cell / 2 - size / 2) + 'px';
    fxEl.appendChild(d);
    setTimeout(() => d.remove(), 480);
  }

  function beam(index, dir) {
    const r = (index / W) | 0, c = index % W;
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

  function popScore(points, index) {
    const r = (index / W) | 0, c = index % W;
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

  // 棋盘上飘一个「② 炸弹」——规则触发的因果锚点
  const ACTION_SHORT = { rocket: '火箭', bomb: '炸弹', rainbow: '彩虹球', bonus: '+150', randbomb: '炸弹' };
  function ruleTag(st) {
    if (st.at == null) return;
    const r = (st.at / W) | 0, c = st.at % W;
    const d = document.createElement('div');
    d.className = 'rule-tag';
    d.textContent = (CN[st.idx] || '') + ' ' + (ACTION_SHORT[st.action] || '');
    d.style.left = (c * cell + cell / 2) + 'px';
    d.style.top = (r * cell) + 'px';
    d.style.background = RULE_COLORS[st.idx] || '#fff';
    fxEl.appendChild(d);
    setTimeout(() => d.remove(), 900);
  }

  function bonusText(amount, index, ruleIdx) {
    let x, y;
    if (index == null) {
      x = cell * W / 2; y = cell * 3;
    } else {
      x = (index % W) * cell + cell / 2;
      y = ((index / W) | 0) * cell;
    }
    const d = document.createElement('div');
    d.className = 'pop-score bonus';
    d.textContent = (ruleIdx != null ? (CN[ruleIdx] || '') + ' ' : '') + '+' + amount;
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    fxEl.appendChild(d);
    setTimeout(() => d.remove(), 820);
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
        case 'ice': meltIce(st.cells); break;
        case 'combo': doCombo(st); break;
        case 'ruleFire':
          if (hooks.onRuleFire) hooks.onRuleFire(st);
          if (st.action && st.action !== 'bonus') ruleTag(st);
          if (st.action) SFX.rule(st.idx);
          break;
        case 'bonus':
          bonusText(st.amount, st.at, st.idx);
          SFX.coin();
          break;
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
    syncBadge(el, st.origin);
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
      if (c.color != null) particles(c.i, M3P.COLORS[c.color], 5);
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
        const el = tileEl({ id: s.id, color: s.color, special: null, origin: null }, startR, c);
        at.set(s.to, el);
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
      syncBadge(el, a.origin);
      el.classList.remove('pop');
      el.classList.add('birth');
      setTimeout(() => el.classList.remove('birth'), 380);
    }
    await wait(300);
  }

  return {
    buildCells, mount, layout, play,
    select, getSelected, hint, clearHint, tileElAt,
    shake, flash, comboText,
    get cell() { return cell; },
  };
})();
