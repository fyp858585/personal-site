/* ============================================================
 * 游戏流程：关卡地图 / 输入 / HUD / 结算 / 存档
 * ============================================================ */
window.Game = (function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const SAVE_KEY = 'match3_basic_v1';
  const W = 8, H = 8;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  let save = { stars: {}, unlocked: 0, muted: false };
  let S = null;
  let levelIdx = 0;
  let busy = false;
  let drag = null;
  let hintTimer = null;
  let idleTimer = null;
  let liveScore = 0;
  let liveCollected = [0, 0, 0, 0, 0];
  let toastTimer = null;

  // ---------------- 存档 ----------------
  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) save = Object.assign(save, JSON.parse(raw));
    } catch (e) { /* 坏档就直接用默认值 */ }
    SFX.setMuted(!!save.muted);
  }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* 隐私模式 */ }
  }

  // ---------------- Toast ----------------
  function toast(text, ms) {
    const el = $('#toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms || 2400);
  }

  // ---------------- 关卡地图 ----------------
  function renderMap() {
    const wrap = $('#levels');
    wrap.innerHTML = '';
    M3.LEVELS.forEach((lv, i) => {
      const locked = i > save.unlocked;
      const stars = save.stars[i] || 0;
      const card = document.createElement('div');
      card.className = 'lvcard' + (locked ? ' locked' : '');
      card.innerHTML =
        `<div class="no">${i + 1}</div>` +
        `<div class="nm">${lv.name}</div>` +
        `<div class="gl">${locked ? '通过上一关解锁' : M3.goalText(lv)}</div>` +
        `<div class="st">${'★'.repeat(stars)}<span class="off">${'★'.repeat(3 - stars)}</span></div>` +
        (locked ? '<div class="lock">🔒</div>' : '');
      if (!locked) card.addEventListener('click', () => { SFX.pick(); startLevel(i); });
      wrap.appendChild(card);
    });
    $('#mapStars').textContent = Object.values(save.stars).reduce((a, b) => a + b, 0);
  }

  function showMap() {
    clearTimeout(hintTimer);
    clearTimeout(idleTimer);
    $('#overlay').classList.add('hidden');
    $('#scrGame').classList.add('hidden');
    $('#scrMap').classList.remove('hidden');
    renderMap();
  }

  // ---------------- 开局 ----------------
  function startLevel(i) {
    levelIdx = i;
    const lv = M3.LEVELS[i];
    const seed = (Math.floor(Math.random() * 1e9) ^ (i * 2654435761)) >>> 0;
    S = M3.createGame(lv, seed);
    liveScore = 0;
    liveCollected = [0, 0, 0, 0, 0];
    busy = false;
    drag = null;

    $('#overlay').classList.add('hidden');
    $('#scrMap').classList.add('hidden');
    $('#scrGame').classList.remove('hidden');
    $('#hudLvNo').textContent = i + 1;
    $('#hudLvName').textContent = lv.name;

    View.mount(S);
    requestAnimationFrame(() => {
      View.layout();
      requestAnimationFrame(() => View.layout());
    });

    drawMoves();
    drawScore(0);
    drawGoals([0, 0, 0, 0, 0], 0);
    toast(lv.tip, 3600);
    scheduleHint();
  }

  function restart() {
    if (busy) return;
    startLevel(levelIdx);
  }

  // ---------------- HUD ----------------
  function drawMoves() {
    const el = $('#hudMoves');
    el.textContent = S.moves;
    el.parentElement.classList.toggle('low', S.moves <= 5);
  }
  function drawScore(v) {
    $('#hudScore').textContent = v;
  }
  function drawGoals(collected, score) {
    const bar = $('#goalbar');
    bar.innerHTML = '';
    const goals = S.level.goals;
    for (const g of goals) {
      const isScore = g.score != null;
      const have = isScore ? score : collected[g.color];
      const need = isScore ? g.score : g.n;
      const pct = Math.max(0, Math.min(100, (have / need) * 100));
      const el = document.createElement('div');
      el.className = 'goal' + (isScore ? ' star' : '') + (have >= need ? ' done' : '');
      const dot = isScore ? '' : `style="--c:${M3.COLORS[g.color]}"`;
      el.innerHTML =
        `<i class="dot" ${dot}></i>` +
        `<div class="gtext">` +
        `<div class="gline"><b>${Math.min(have, need)}</b><i>/${need}</i></div>` +
        `<div class="gbar"><i style="width:${pct}%"></i></div>` +
        `</div>`;
      bar.appendChild(el);
    }
  }

  // ---------------- 输入 ----------------
  function cellAt(ev) {
    const rect = $('#tiles').getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return -1;
    const c = Math.floor(x / View.cell);
    const r = Math.floor(y / View.cell);
    if (c < 0 || c >= W || r < 0 || r >= H) return -1;
    return r * W + c;
  }

  function bumpIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(autoHint, 6500);
  }
  function scheduleHint() {
    clearTimeout(hintTimer);
    bumpIdle();
  }
  function autoHint() {
    if (busy || !S || $('#scrGame').classList.contains('hidden')) return;
    const pair = M3.findHint(S);
    if (pair) View.hint(pair);
  }

  function onDown(ev) {
    SFX.unlock();
    if (busy || !S) return;
    const i = cellAt(ev);
    if (i < 0) return;
    ev.preventDefault();
    View.clearHint();
    drag = { start: i, x: ev.clientX, y: ev.clientY, moved: false };
    const el = View.tileElAt(i);
    if (el) el.classList.add('grab');
    SFX.pick();
    bumpIdle();
  }

  function onMove(ev) {
    if (!drag || drag.moved || busy) return;
    const dx = ev.clientX - drag.x;
    const dy = ev.clientY - drag.y;
    const threshold = View.cell * 0.3;
    if (Math.hypot(dx, dy) < threshold) return;

    const r = (drag.start / W) | 0, c = drag.start % W;
    let r2 = r, c2 = c;
    if (Math.abs(dx) > Math.abs(dy)) c2 += dx > 0 ? 1 : -1;
    else r2 += dy > 0 ? 1 : -1;
    if (r2 < 0 || r2 >= H || c2 < 0 || c2 >= W) return;

    drag.moved = true;
    removeGrab();
    attemptMove(drag.start, r2 * W + c2);
  }

  function onUp(ev) {
    if (!drag) return;
    const wasDrag = drag.moved;
    const start = drag.start;
    drag = null;
    removeGrab();
    if (wasDrag || busy) return;

    const sel = View.getSelected();
    // 先判断「和已选中的棋子相邻」——相邻就是交换（含道具组合技）
    if (sel >= 0 && sel !== start) {
      const dr = Math.abs(((sel / W) | 0) - ((start / W) | 0));
      const dc = Math.abs((sel % W) - (start % W));
      if (dr + dc === 1) { View.select(-1); attemptMove(sel, start); return; }
    }
    // 道具：点一下就发动，不用再凑三连
    if (isSpecialAt(start)) { View.select(-1); tapSpecial(start); return; }
    if (sel === start) View.select(-1);
    else View.select(start);
  }

  function isSpecialAt(i) {
    const t = S && S.board[i];
    return !!(t && t.special);
  }

  function removeGrab() {
    document.querySelectorAll('#tiles .tile.grab').forEach((el) => el.classList.remove('grab'));
  }

  // ---------------- 一次操作 ----------------
  function attemptMove(a, b) {
    return runAction(() => M3.resolveMove(S, a, b));
  }
  function tapSpecial(i) {
    return runAction(() => M3.resolveTap(S, i));
  }

  async function runAction(fn) {
    if (busy || !S) return;
    busy = true;
    clearTimeout(hintTimer);
    clearTimeout(idleTimer);
    View.clearHint();
    View.select(-1);

    const beforeScore = S.score;
    const beforeCollected = S.collected.slice();
    const res = fn();

    liveScore = beforeScore;
    liveCollected = beforeCollected;
    drawMoves();

    if (res.invalid) {
      await View.play(res.steps);
      busy = false;
      scheduleHint();
      return;
    }

    await View.play(res.steps, {
      onClear(st) {
        liveScore += st.points;
        for (const c of st.cells) if (c.color != null) liveCollected[c.color]++;
        drawScore(liveScore);
        drawGoals(liveCollected, liveScore);
      },
    });

    // 以引擎状态为准做最终对齐
    drawScore(S.score);
    drawGoals(S.collected, S.score);
    drawMoves();
    busy = false;

    await wait(120);
    checkEnd();
    scheduleHint();
  }

  function checkEnd() {
    if (M3.isWin(S)) return showResult(true);
    if (S.moves <= 0) return showResult(false);
  }

  // ---------------- 结算 ----------------
  function starHTML(n) {
    let html = '';
    for (let i = 0; i < 3; i++) html += `<span class="${i < n ? '' : 'off'}">★</span>`;
    return html;
  }

  function showResult(win) {
    clearTimeout(hintTimer);
    clearTimeout(idleTimer);
    const overlay = $('#overlay');
    const lv = M3.LEVELS[levelIdx];
    const isLast = levelIdx >= M3.LEVELS.length - 1;

    if (win) {
      const stars = M3.starsFor(lv, S);
      save.stars[levelIdx] = Math.max(save.stars[levelIdx] || 0, stars);
      if (!isLast) save.unlocked = Math.max(save.unlocked, levelIdx + 1);
      persist();
      SFX.win();
      [0, 1, 2].forEach((i) => { if (i < stars) setTimeout(() => SFX.star(i), 220 + i * 180); });

      $('#dialog').className = 'dialog win';
      $('#dialog').innerHTML =
        `<h2>过关！</h2>` +
        `<div class="stars">${starHTML(stars)}</div>` +
        `<p class="sub">第 ${levelIdx + 1} 关 · ${lv.name}</p>` +
        `<div class="scoreline">得分 <b>${S.score}</b></div>` +
        `<div class="tip">剩余 ${S.moves} 步 · 最高连消 ×${S.maxChain}</div>` +
        `<div class="btns">` +
        (isLast
          ? `<button class="btn" id="dlgMap">全部通关！</button>`
          : `<button class="btn" id="dlgNext">下一关 →</button>`) +
        `<button class="btn soft" id="dlgRetry">再玩一次</button>` +
        `</div>`;
      const next = $('#dlgNext');
      if (next) next.addEventListener('click', () => { SFX.pick(); startLevel(levelIdx + 1); });
    } else {
      SFX.lose();
      $('#dialog').className = 'dialog lose';
      $('#dialog').innerHTML =
        `<h2>步数用完了</h2>` +
        `<p class="sub">第 ${levelIdx + 1} 关 · ${lv.name}</p>` +
        `<div class="scoreline">得分 <b>${S.score}</b></div>` +
        `<div class="tip">目标：${M3.goalText(lv)}</div>` +
        `<div class="btns">` +
        `<button class="btn" id="dlgRetry">再试一次</button>` +
        `<button class="btn soft" id="dlgMap">回地图</button>` +
        `</div>`;
    }

    overlay.classList.remove('hidden');
    const mapBtn = $('#dlgMap');
    if (mapBtn) mapBtn.addEventListener('click', () => { SFX.pick(); showMap(); });
    const retryBtn = $('#dlgRetry');
    if (retryBtn) retryBtn.addEventListener('click', () => { SFX.pick(); startLevel(levelIdx); });
  }

  // ---------------- 音效按钮 ----------------
  function updateSoundBtns() {
    const label = save.muted ? '🔇' : '🔊';
    $('#btnSound').textContent = label;
    $('#btnMapSound').textContent = (save.muted ? '🔇' : '🔊') + ' 音效';
  }
  function toggleSound() {
    save.muted = !save.muted;
    SFX.setMuted(save.muted);
    persist();
    updateSoundBtns();
    if (!save.muted) SFX.pick();
  }

  // ---------------- 初始化 ----------------
  function init() {
    loadSave();
    updateSoundBtns();
    View.buildCells();
    renderMap();

    $('#board').addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', () => { drag = null; removeGrab(); });

    $('#btnBack').addEventListener('click', () => { if (!busy) { SFX.pick(); showMap(); } });
    $('#btnRestart').addEventListener('click', () => { SFX.pick(); restart(); });
    $('#btnHint').addEventListener('click', () => {
      SFX.pick();
      const pair = M3.findHint(S);
      if (pair) View.hint(pair);
    });
    $('#btnSound').addEventListener('click', toggleSound);
    $('#btnMapSound').addEventListener('click', toggleSound);
    $('#btnReset').addEventListener('click', () => {
      if (!confirm('清除全部关卡进度和星星？')) return;
      save = { stars: {}, unlocked: 0, muted: save.muted };
      persist();
      renderMap();
      toast('进度已清除', 1600);
    });

    window.addEventListener('resize', () => {
      if (!$('#scrGame').classList.contains('hidden')) View.layout();
    });
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        if (!$('#scrGame').classList.contains('hidden')) View.layout();
      });
      ro.observe($('#boardWrap'));
    }
  }

  return { init, toast, get state() { return S; } };
})();

document.addEventListener('DOMContentLoaded', () => window.Game.init());
