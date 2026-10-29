/* ============================================================
 * 编程三消 · 应用层
 *
 * 三件事：
 *   1. 把「程序」做成可点的规则表（4 条 · 从上到下 · 第一条命中即止）
 *   2. 把引擎的 steps 翻译成「谁触发了 / 谁为什么没通过」的执行记录
 *   3. 关卡流程：换关、同盘重开、结算、存档
 * ============================================================ */
window.Game = (function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const SAVE_KEY = 'm3p_save_v1';
  const W = 8, H = 8;
  const CN = ['①', '②', '③', '④'];
  const RULE_COLORS = ['#6ea8fe', '#ffc93c', '#c084fc', '#4ade80'];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  let save = { program: null, stars: {}, muted: false, seen: false, level: 0 };
  let S = null;
  let levelIdx = 0;
  let busy = false;
  let modalOpen = false;
  let resultShown = false;
  let drag = null;
  let hintTimer = null;
  let idleTimer = null;
  let toastTimer = null;
  let liveScore = 0;
  let liveCollected = [0, 0, 0, 0, 0];
  let ruleEls = [];

  // ---------------- 存档 ----------------
  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) save = Object.assign(save, JSON.parse(raw));
    } catch (e) { /* 坏档用默认 */ }
    save.program = save.program ? M3P.normalizeProgram(save.program) : M3P.defaultProgram();
    if (!save.stars || typeof save.stars !== 'object') save.stars = {};
    if (!(save.level >= 0 && save.level < M3P.LEVELS.length)) save.level = 0;
    SFX.setMuted(!!save.muted);
  }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* 隐私模式 */ }
  }

  // ---------------- 小工具 ----------------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function toast(text, ms) {
    const el = $('#toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms || 2400);
  }
  function hideToast() { clearTimeout(toastTimer); $('#toast').classList.remove('show'); }
  function tipHTML(text) {
    return esc(text).replace(/「([^」]+)」/g, '<b>「$1」</b>');
  }

  // ---------------- 关卡标签 ----------------
  function renderTabs() {
    const wrap = $('#levelTabs');
    wrap.innerHTML = M3P.LEVELS.map((lv, i) => {
      const stars = save.stars[i] || 0;
      return `<button class="lv-tab${i === levelIdx ? ' active' : ''}${lv.sandbox ? ' sandbox' : ''}" data-i="${i}">
        <span class="no">${lv.sandbox ? '∞' : i + 1}</span>
        <span>${esc(lv.name)}</span>
        <span class="sm">${esc(lv.tag)}</span>
        ${stars ? `<span class="st">★</span>` : ''}
      </button>`;
    }).join('');
  }

  // ---------------- 开局 ----------------
  function startLevel(i, opts) {
    opts = opts || {};
    levelIdx = Math.max(0, Math.min(M3P.LEVELS.length - 1, i));
    save.level = levelIdx;
    const lv = M3P.LEVELS[levelIdx];
    const seed = opts.seed != null ? (opts.seed >>> 0) : ((Math.random() * 1e9) ^ (levelIdx * 2654435761)) >>> 0;

    S = M3P.createGame(lv, seed, save.program);
    liveScore = 0;
    liveCollected = [0, 0, 0, 0, 0];
    busy = false;
    modalOpen = false;
    resultShown = false;
    drag = null;
    clearTimeout(hintTimer);
    clearTimeout(idleTimer);
    hideOverlay();
    hideToast();

    View.select(-1);
    View.clearHint();
    View.mount(S);
    requestAnimationFrame(() => {
      View.layout();
      requestAnimationFrame(() => View.layout());
    });

    renderTabs();
    drawTip();
    updateRecRow();
    drawHud();
    clearLog();
    persist();
    scheduleHint();
  }

  function drawTip() {
    const lv = M3P.LEVELS[levelIdx];
    $('#levelTip').innerHTML = tipHTML(lv.tip);
  }

  function updateRecRow() {
    const lv = M3P.LEVELS[levelIdx];
    const row = $('#recRow');
    if (lv.rec && M3P.RECIPES[lv.rec]) {
      row.innerHTML = `<button class="rec-btn" id="btnRec">📋 抄一份本关推荐程序</button>`;
      $('#btnRec').addEventListener('click', () => applyRecipe(lv.rec));
    } else {
      row.innerHTML = '';
    }
  }

  function applyRecipe(key) {
    save.program = M3P.normalizeProgram(M3P.RECIPES[key].map((r) => ({ ...r })));
    commitProgram();
    renderRules();
    toast('推荐程序已载入 · 下一步生效；想从头对比就点「重开本盘」', 3400);
    SFX.pick();
  }

  function restoreFactory() {
    save.program = M3P.defaultProgram();
    commitProgram();
    renderRules();
    toast('已恢复出厂程序（经典三消）· 下一步生效', 2600);
    SFX.pick();
  }

  // ---------------- HUD ----------------
  function drawHud(scoreOverride, collectedOverride) {
    if (!S) return;
    const sc = scoreOverride == null ? S.score : scoreOverride;
    const col = collectedOverride || S.collected;
    $('#hudMoves').textContent = S.moves;
    $('#movesBox').classList.toggle('low', S.moves <= 5);
    $('#hudScore').textContent = sc;

    const bar = $('#goalbar');
    bar.innerHTML = '';
    const gs = M3P.goalProgress(S);
    if (!gs.length) {
      bar.innerHTML = '<div class="goal"><div class="gtext"><div class="gline">自由练习</div></div></div>';
      return;
    }
    for (const g of gs) {
      let have, need, color, cls = '';
      if (g.kind === 'score') {
        have = sc; need = g.need; color = '#ffc93c'; cls = ' star';
      } else if (g.kind === 'color') {
        have = col[g.color]; need = g.need; color = M3P.COLORS[g.color];
      } else {
        have = g.have; need = g.need; color = '#a5d8ff'; cls = ' ice';
      }
      const done = have >= need;
      const pct = need ? Math.max(0, Math.min(100, (have / need) * 100)) : 0;
      const shown = g.kind === 'color' ? Math.min(have, need) : have;
      bar.insertAdjacentHTML('beforeend', `
        <div class="goal${cls}${done ? ' done' : ''}">
          <i class="dot" style="--c:${color}"></i>
          <div class="gtext">
            <div class="gline"><b>${shown}</b><i>/${need}</i></div>
            <div class="gbar"><i style="width:${pct}%"></i></div>
          </div>
        </div>`);
    }
  }

  // ---------------- 关卡结束 ----------------
  function checkEnd() {
    if (!S || resultShown) return;
    if (M3P.isWin(S)) { resultShown = true; showResult(true); return; }
    if (!S.level.sandbox && S.moves <= 0) { resultShown = true; showResult(false); }
  }

  function starHTML(n) {
    let h = '';
    for (let i = 0; i < 3; i++) h += `<span class="${i < n ? '' : 'off'}">★</span>`;
    return h;
  }

  function showResult(win) {
    hideToast();
    modalOpen = true;
    busy = false;
    clearTimeout(hintTimer);
    clearTimeout(idleTimer);
    View.clearHint();
    View.select(-1);

    const lv = M3P.LEVELS[levelIdx];
    const isLast = levelIdx >= M3P.LEVELS.length - 1;
    const dlg = $('#dialog');

    if (win) {
      const stars = M3P.starsFor(lv, S);
      save.stars[levelIdx] = Math.max(save.stars[levelIdx] || 0, stars);
      persist();
      renderTabs();
      SFX.win();
      [0, 1, 2].forEach((i) => { if (i < stars) setTimeout(() => SFX.star(i), 220 + i * 170); });
      dlg.className = 'dialog win';
      dlg.innerHTML = `
        <h2>过关！</h2>
        <div class="stars">${starHTML(stars)}</div>
        <p class="sub">第 ${levelIdx + 1} 关 · ${esc(lv.name)}</p>
        <div class="scoreline">得分 <b>${S.score}</b></div>
        <div class="tip">剩余 ${S.moves} 步 · 最高连消 ×${S.maxChain} · 规则触发 ${S.rulesFired} 次</div>
        <div class="btns">
          ${isLast ? `<button id="dlgNext">全部完成</button>` : `<button id="dlgNext">下一关 →</button>`}
          <button id="dlgRetry" class="ghost">重开本盘</button>
        </div>`;
      $('#dlgNext').addEventListener('click', () => {
        if (isLast) { hideOverlay(); modalOpen = false; toast('四个关卡都走完了 · 可以去沙盒继续折腾', 3000); }
        else startLevel(levelIdx + 1);
      });
      $('#dlgRetry').addEventListener('click', () => startLevel(levelIdx, { seed: S.seed }));
    } else {
      SFX.lose();
      const lacks = M3P.goalProgress(S).filter((g) => !g.done).map((g) => {
        if (g.kind === 'score') return `分数 ${g.have}/${g.need}`;
        if (g.kind === 'ice') return `冰还剩 ${g.left}`;
        return `${M3P.COLOR_NAMES[g.color]} ${Math.min(g.have, g.need)}/${g.need}`;
      });
      dlg.className = 'dialog lose';
      dlg.innerHTML = `
        <h2>步数用完了</h2>
        <p class="sub">第 ${levelIdx + 1} 关 · ${esc(lv.name)}</p>
        <div class="scoreline">得分 <b>${S.score}</b></div>
        <div class="progline">还差：${esc(lacks.join(' · ') || '一点点')}</div>
        <p class="tip">别急着重开——先改一条规则。程序是这张表里唯一会变的东西。</p>
        <div class="btns">
          <button id="dlgEdit">去改程序</button>
          <button id="dlgRetry" class="ghost">重开本盘</button>
          <button id="dlgNew" class="ghost">换个棋盘</button>
        </div>`;
      $('#dlgEdit').addEventListener('click', () => {
        hideOverlay(); modalOpen = false;
        toast('改完程序，点左下角「重开本盘」——同一个棋盘重来', 3600);
      });
      $('#dlgRetry').addEventListener('click', () => startLevel(levelIdx, { seed: S.seed }));
      $('#dlgNew').addEventListener('click', () => startLevel(levelIdx));
    }

    $('#overlay').classList.remove('hidden');
  }

  function hideOverlay() { $('#overlay').classList.add('hidden'); }

  // ---------------- 帮助 ----------------
  function showHelp() {
    hideToast();
    modalOpen = true;
    clearTimeout(hintTimer);
    clearTimeout(idleTimer);
    View.clearHint();
    View.select(-1);
    const dlg = $('#dialog');
    dlg.className = 'dialog help';
    dlg.innerHTML = `
      <h2>这不是普通三消<span class="sub2">右边不是代码编辑器，是一张会执行的规则表</span></h2>
      <p>左边照常玩。右边四条规则从上往下检查，<b>第一条满足的生效，后面的直接跳过</b>——这就是 if / else。</p>
      <p class="fine">不同触发时机是分开检查的：<b>「每步开始」的规则不会挡住「玩家消除」的规则</b>，它们各算各的。</p>
      <div class="help-demo">
        <div><span class="h">①</span> 当玩家消除 且 连数≥5 <span class="a">→ 彩虹球</span></div>
        <div><span class="h">②</span> 当玩家消除 且 形状=折角 <span class="a">→ 炸弹</span></div>
        <div><span class="h">③</span> 当玩家消除 且 连数≥4 <span class="a">→ 火箭</span></div>
        <div><span class="h">④</span> 当每步开始 <span class="a">→ 随机变炸弹</span> <span class="c">（示例）</span></div>
      </div>
      <p>改任何一格，<b>下一步就生效</b>。点「重开本盘」可以用<b>同一个棋盘</b>对比两套程序，差别一眼可见。</p>
      <p>特殊棋子<b>可以点，也可以和相邻棋子交换</b>；右上角的 ①②③ 是它的出处。下面的执行记录会写清楚每条规则为什么没通过、实际值是多少。</p>
      <div class="btns"><button id="helpClose">开始玩</button></div>`;
    $('#helpClose').addEventListener('click', () => {
      hideOverlay();
      modalOpen = false;
      save.seen = true;
      persist();
      scheduleHint();
    });
    $('#overlay').classList.remove('hidden');
  }

  // ============================================================
  // 程序编辑器
  // ============================================================
  function commitProgram() {
    save.program = M3P.normalizeProgram(save.program);
    if (S) S.program = M3P.cloneProgram(save.program);
    persist();
  }

  function sanitizeRule(r) {
    const allowed = M3P.CONDS_FOR[r.trigger] || [];
    if (r.c1 && allowed.indexOf(r.c1) < 0) r.c1 = null;
    if (r.c2 && allowed.indexOf(r.c2) < 0) r.c2 = null;
    if (!r.c1 && r.c2) { r.c1 = r.c2; r.c2 = null; }
    const acts = M3P.ACTIONS_FOR[r.trigger] || [];
    if (r.action && acts.indexOf(r.action) < 0) r.action = acts[0] || null;
    if (!r.action) r.on = false;
    return r;
  }

  const COND_CAT = {
    min3: 'num', min4: 'num', min5: 'num', casc2: 'num', casc3: 'num', low5: 'num', low8: 'num',
    line: 'shape', corner: 'shape', horiz: 'shape', vert: 'shape',
    c0: 'color', c1: 'color', c2: 'color', c3: 'color', c4: 'color',
  };

  // 第二条件尽量选一个「换个维度」的，避免 min5 且 min3 这种废话
  function pickSecondCond(r) {
    if (r.trigger === 'turn') return null;
    const allowed = M3P.CONDS_FOR[r.trigger] || [];
    const free = allowed.filter((c) => c !== r.c1 && c !== r.c2);
    if (!free.length) return null;
    if (!r.c1) return free.find((c) => COND_CAT[c] === 'color') || free[0];
    if (COND_CAT[r.c1] === 'color') {
      return free.find((c) => c === 'min4') || free.find((c) => COND_CAT[c] === 'shape') || free[0];
    }
    return free.find((c) => COND_CAT[c] === 'color') || free[0];
  }

  function options(list, selected, emptyLabel) {
    let h = emptyLabel != null ? `<option value="">${esc(emptyLabel)}</option>` : '';
    for (const item of list) {
      h += `<option value="${item.id}"${item.id === selected ? ' selected' : ''}>${esc(item.label)}</option>`;
    }
    return h;
  }

  function renderRules() {
    const wrap = $('#rules');
    wrap.innerHTML = '';
    ruleEls = [];
    save.program = M3P.normalizeProgram(save.program);

    save.program.forEach((r, i) => {
      if (!r.action) {
        const row = document.createElement('div');
        row.className = 'rule empty';
        row.dataset.i = i;
        row.innerHTML = `<span class="plus">＋</span><span>空槽位 · 点一下装一条兜底规则</span>`;
        wrap.appendChild(row);
        ruleEls[i] = row;
        return;
      }

      const allowed = M3P.CONDS_FOR[r.trigger] || [];
      const acts = M3P.ACTIONS_FOR[r.trigger] || [];
      const canAddCond = r.trigger !== 'turn' && allowed.some((c) => c !== r.c1 && c !== r.c2);
      const dis = r.on ? '' : ' disabled';
      const row = document.createElement('div');
      row.className = 'rule' + (r.on ? '' : ' off');
      row.dataset.i = i;
      row.style.setProperty('--rc', RULE_COLORS[i]);
      row.innerHTML = `
        <button class="rule-no" data-op="toggle" title="${r.on ? '停用这条规则' : '启用这条规则'}">${CN[i]}</button>
        <div class="rule-main">
          <div class="rule-line">
            <span class="kw">当</span>
            <select class="tok trig" data-f="trigger" aria-label="触发时机"${dis}>${options(Object.values(M3P.TRIGGERS), r.trigger)}</select>
            <select class="tok cond" data-f="c1" aria-label="第一个条件"${dis}>${options(allowed.map((c) => M3P.CONDS[c]), r.c1, '（无条件）')}</select>
            ${r.c2
              ? `<span class="cond2"><span class="and">且</span>
                   <select class="tok cond" data-f="c2" aria-label="第二个条件"${dis}>${options(allowed.map((c) => M3P.CONDS[c]), r.c2)}</select>
                   <button class="xcond" data-op="delcond" title="去掉第二个条件"${dis}>✕</button>
                 </span>`
              : (canAddCond ? `<button class="addcond" data-op="addcond" title="再加一个条件"${dis}>＋且</button>` : '')}
            <span class="arrow">→</span>
            <select class="tok act" data-f="action" aria-label="动作"${dis}>${options(acts.map((a) => M3P.ACTIONS[a]), r.action)}</select>
          </div>
          <div class="rule-sub" title="优先级决定谁先被检查；成本当前只是设计参考，没有预算限制">优先级 ${i + 1} · ${r.on ? `成本 ${M3P.ruleCost(r)}` : '已停用'}</div>
        </div>
        <div class="rule-seq">
          <button data-op="up" title="上移"${i === 0 ? ' disabled' : ''}>▲</button>
          <button data-op="down" title="下移"${i === 3 ? ' disabled' : ''}>▼</button>
          <button data-op="del" title="清空这条规则">✕</button>
        </div>`;
      wrap.appendChild(row);
      ruleEls[i] = row;
    });
  }

  function flashRule(idx) {
    const el = ruleEls[idx];
    if (!el) return;
    el.classList.remove('fire');
    void el.offsetWidth;
    el.classList.add('fire');
    setTimeout(() => el.classList.remove('fire'), 700);
  }

  function onRulesChange(ev) {
    const sel = ev.target.closest('select[data-f]');
    if (!sel) return;
    const row = sel.closest('.rule');
    if (!row) return;
    const i = +row.dataset.i;
    const r = save.program[i];
    if (!r) return;
    const f = sel.dataset.f;

    if (f === 'trigger') {
      const oldAct = r.action;
      r.trigger = sel.value;
      const allowed = M3P.CONDS_FOR[r.trigger];
      if (r.c1 && allowed.indexOf(r.c1) < 0) r.c1 = null;
      if (r.c2 && allowed.indexOf(r.c2) < 0) r.c2 = null;
      if (!r.c1 && r.c2) { r.c1 = r.c2; r.c2 = null; }
      if (r.action && M3P.ACTIONS_FOR[r.trigger].indexOf(r.action) < 0) {
        r.action = M3P.ACTIONS_FOR[r.trigger][0] || null;
        if (r.action) {
          toast(`「${M3P.ACTIONS[oldAct].label}」不适用于「${M3P.TRIGGERS[r.trigger].label}」，已换成「${M3P.ACTIONS[r.action].label}」`, 3200);
        } else {
          r.on = false;
        }
      }
    } else if (f === 'c1') {
      r.c1 = sel.value || null;
      if (!r.c1 && r.c2) { r.c1 = r.c2; r.c2 = null; }
    } else if (f === 'c2') {
      r.c2 = sel.value || null;
    } else if (f === 'action') {
      r.action = sel.value;
    }
    sanitizeRule(r);
    commitProgram();
    renderRules();
  }

  function onRulesClick(ev) {
    const row = ev.target.closest('.rule');
    if (!row) return;
    const i = +row.dataset.i;
    const r = save.program[i];
    if (!r) return;

    if (row.classList.contains('empty')) {
      save.program[i] = M3P.makeRule('player', null, null, 'bonus');
      commitProgram();
      renderRules();
      toast('装了一条兜底规则：任何「玩家消除」→ +150 分。放在最后就是 else；放在前面会挡住后面的规则。', 4200);
      SFX.pick();
      return;
    }

    const opBtn = ev.target.closest('[data-op]');
    const op = opBtn && opBtn.dataset.op;
    if (!op) return;

    if (op === 'toggle') {
      if (!r.action) return;
      r.on = !r.on;
      commitProgram();
      renderRules();
      SFX.pick();
      return;
    }
    if (op === 'up' && i > 0) {
      [save.program[i - 1], save.program[i]] = [save.program[i], save.program[i - 1]];
      commitProgram(); renderRules(); SFX.swap();
      return;
    }
    if (op === 'down' && i < 3) {
      [save.program[i + 1], save.program[i]] = [save.program[i], save.program[i + 1]];
      commitProgram(); renderRules(); SFX.swap();
      return;
    }
    if (op === 'del') {
      save.program[i] = M3P.emptyRule(r.trigger);
      commitProgram(); renderRules(); SFX.pick();
      return;
    }
    if (op === 'addcond') {
      const pick = pickSecondCond(r);
      if (!pick) return;
      if (!r.c1) r.c1 = pick;
      else if (!r.c2) r.c2 = pick;
      commitProgram(); renderRules();
      return;
    }
    if (op === 'delcond') {
      r.c2 = null;
      commitProgram(); renderRules();
    }
  }

  // ============================================================
  // 执行记录
  // ============================================================
  function ruleLineHTML(l) {
    const no = CN[l.idx] || '';
    const rc = RULE_COLORS[l.idx] || '#6ea8fe';
    const txt = l.pass ? esc(l.text) : '未通过 · ' + esc(l.text);
    return `<div class="log-line ${l.pass ? 'fire' : 'skip'}" style="--rc:${rc}"><span class="no">${no}</span><span class="txt">${txt}</span></div>`;
  }

  function linesHTML(lines) {
    if (!lines.length) return '';
    if (!lines.some((l) => l.pass)) {
      const parts = lines.map((l) => `${CN[l.idx] || ''} ${esc(l.text)}`).join(' · ');
      return `<div class="log-line none"><span class="txt">都没命中 · ${parts}</span></div>`;
    }
    return lines.map(ruleLineHTML).join('');
  }

  function addLog(before, steps) {
    const groups = new Map();
    const turnLines = [];
    let maxChain = 0;

    for (const st of steps) {
      if (st.t !== 'match') continue;
      maxChain = Math.max(maxChain, st.chain);
      for (const g of st.groups) {
        groups.set(st.chain + ':' + g.gi, { chain: st.chain, desc: g.desc, lines: [] });
      }
    }
    for (const st of steps) {
      if (st.t !== 'ruleFire' && st.t !== 'ruleSkip') continue;
      const line = { idx: st.idx, pass: st.t === 'ruleFire', text: st.text };
      if (st.chain === 0) { turnLines.push(line); continue; }
      const key = st.chain + ':' + st.gi;
      let g = groups.get(key);
      if (!g) { g = { chain: st.chain, desc: '匹配', lines: [] }; groups.set(key, g); }
      g.lines.push(line);
    }

    const secs = [];
    if (turnLines.length) {
      secs.push(`<div class="log-sec turn"><div class="log-gdesc">每步开始</div>${linesHTML(turnLines)}</div>`);
    }
    let hasCascadeLines = false;
    for (const g of groups.values()) {
      if (!g.lines.length) continue;
      if (g.chain >= 2) hasCascadeLines = true;
      secs.push(`<div class="log-sec"><div class="log-gdesc">${esc(g.desc)}</div>${linesHTML(g.lines)}</div>`);
    }
    if (!secs.length) {
      const hadBlast = steps.some((s) => s.t === 'blast' || s.t === 'combo');
      const txt = hadBlast
        ? '这次是道具爆炸，没有产生新的匹配组'
        : (groups.size ? '这次匹配没有命中任何已启用的规则' : '没有规则被检查');
      secs.push(`<div class="log-sec"><div class="log-line none"><span class="txt">${txt}</span></div></div>`);
    } else if (maxChain >= 2 && !hasCascadeLines && M3P.LEVELS[levelIdx].rec === 'score') {
      secs.push(`<div class="log-sec"><div class="log-gdesc">连消 ×${maxChain}</div><div class="log-line none"><span class="txt">没有规则监听「连消」——这是一个可以写规则的位置</span></div></div>`);
    }
    if (steps.some((s) => s.t === 'shuffle')) {
      secs.push(`<div class="log-sec"><div class="log-gdesc">棋盘重排</div><div class="log-line none"><span class="txt">没有可走的步了，颜色重新洗过</span></div></div>`);
    }

    const gain = S.score - before.score;
    const stepNo = S.movesTotal - S.moves;
    const html = `<div class="log-move">
      <div class="log-title">
        <span>第 ${stepNo} 步</span>
        <span><span class="gain">+${gain}</span>${maxChain > 1 ? ` <span class="chain">连消 ×${maxChain}</span>` : ''}</span>
      </div>
      ${secs.join('')}
    </div>`;

    const log = $('#log');
    const empty = log.querySelector('.log-empty');
    if (empty) empty.remove();
    log.insertAdjacentHTML('afterbegin', html);
    while (log.children.length > 14) log.lastElementChild.remove();
    log.scrollTop = 0;
  }

  function clearLog() {
    $('#log').innerHTML = '<div class="log-empty">走一步。这里会逐条告诉你：<br>哪条规则触发了，哪条没通过、实际值是多少。</div>';
  }

  // ============================================================
  // 输入
  // ============================================================
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
    idleTimer = setTimeout(autoHint, 7000);
  }
  function scheduleHint() {
    clearTimeout(hintTimer);
    bumpIdle();
  }
  function autoHint() {
    if (busy || modalOpen || !S) return;
    if (S.moves <= 0) return;
    const pair = M3P.findHint(S);
    if (pair) View.hint(pair);
  }

  function onDown(ev) {
    SFX.unlock();
    if (busy || modalOpen || !S) return;
    if (S.moves <= 0) { toast('没有步数了 · 改程序后点「重开本盘」', 2200); return; }
    const i = cellAt(ev);
    if (i < 0) return;
    ev.preventDefault();
    View.clearHint();
    clearTimeout(idleTimer);
    drag = { start: i, x: ev.clientX, y: ev.clientY, moved: false };
    const el = View.tileElAt(i);
    if (el) el.classList.add('grab');
    SFX.pick();
    bumpIdle();
  }

  function onMove(ev) {
    if (!drag || drag.moved || busy || modalOpen) return;
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

  function onUp() {
    if (!drag) return;
    const wasDrag = drag.moved;
    const start = drag.start;
    drag = null;
    removeGrab();
    if (wasDrag || busy || modalOpen) return;
    if (!S || S.moves <= 0) return;

    const sel = View.getSelected();
    if (sel >= 0 && sel !== start) {
      const dr = Math.abs(((sel / W) | 0) - ((start / W) | 0));
      const dc = Math.abs((sel % W) - (start % W));
      if (dr + dc === 1) { View.select(-1); attemptMove(sel, start); return; }
    }
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

  // ============================================================
  // 一次操作
  // ============================================================
  function attemptMove(a, b) { return runAction(() => M3P.resolveMove(S, a, b)); }
  function tapSpecial(i) { return runAction(() => M3P.resolveTap(S, i)); }

  async function runAction(fn) {
    if (busy || !S) return;
    busy = true;
    clearTimeout(hintTimer);
    clearTimeout(idleTimer);
    View.clearHint();
    View.select(-1);

    const before = { score: S.score, moves: S.moves, collected: S.collected.slice(), ice: M3P.iceLeft(S) };
    liveScore = before.score;
    liveCollected = before.collected.slice();

    let res;
    try {
      res = fn();
    } catch (err) {
      console.error('move failed', err);
      busy = false;
      scheduleHint();
      toast('这一步出了点问题，再试一次', 2200);
      return;
    }
    if (res.invalid) {
      await View.play(res.steps);
      busy = false;
      scheduleHint();
      return;
    }

    drawHud(liveScore, liveCollected);
    await View.play(res.steps, {
      onClear(st) {
        liveScore += st.points;
        for (const c of st.cells) if (c.color != null) liveCollected[c.color]++;
        drawHud(liveScore, liveCollected);
      },
      onRuleFire(st) {
        flashRule(st.idx);
        if (st.action === 'bonus') {
          liveScore += M3P.BONUS_AMT;
          drawHud(liveScore, liveCollected);
        }
      },
    });

    liveScore = S.score;
    liveCollected = S.collected.slice();
    drawHud();
    addLog(before, res.steps);
    busy = false;
    await wait(60);
    checkEnd();
    scheduleHint();
  }

  // ============================================================
  // 音效
  // ============================================================
  function updateSoundBtn() {
    $('#btnSound').textContent = save.muted ? '🔇' : '🔊';
    $('#btnSound').title = save.muted ? '开启音效' : '关闭音效';
  }
  function toggleSound() {
    save.muted = !save.muted;
    SFX.setMuted(save.muted);
    persist();
    updateSoundBtn();
    if (!save.muted) SFX.pick();
  }

  // ============================================================
  // 初始化
  // ============================================================
  function init() {
    loadSave();
    updateSoundBtn();
    View.buildCells();
    renderRules();
    startLevel(save.level || 0);

    $('#btnSound').addEventListener('click', toggleSound);
    $('#btnHelp').addEventListener('click', showHelp);
    $('#btnFactory').addEventListener('click', restoreFactory);
    $('#btnRestart').addEventListener('click', () => {
      if (busy) return;
      SFX.pick();
      startLevel(levelIdx, { seed: S.seed });
      toast('同一个棋盘，程序换成现在这版——直接对比', 2400);
    });
    $('#btnNew').addEventListener('click', () => {
      if (busy) return;
      SFX.pick();
      startLevel(levelIdx);
    });
    $('#btnHint').addEventListener('click', () => {
      if (busy || modalOpen) return;
      SFX.pick();
      if (!S) return;
      const pair = M3P.findHint(S);
      if (pair) View.hint(pair); else toast('没有可走的步了', 1600);
    });
    $('#btnClearLog').addEventListener('click', () => { clearLog(); SFX.pick(); });

    $('#levelTabs').addEventListener('click', (ev) => {
      const btn = ev.target.closest('.lv-tab');
      if (!btn || busy) return;
      const i = +btn.dataset.i;
      if (i === levelIdx) return;
      SFX.pick();
      startLevel(i);
    });

    $('#rules').addEventListener('change', onRulesChange);
    $('#rules').addEventListener('click', onRulesClick);

    $('#board').addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', () => { drag = null; removeGrab(); });

    window.addEventListener('resize', () => View.layout());
    if (window.ResizeObserver) {
      new ResizeObserver(() => View.layout()).observe($('#boardWrap'));
    }

    if (!save.seen) setTimeout(showHelp, 500);
  }

  return { init, toast, get state() { return S; } };
})();

document.addEventListener('DOMContentLoaded', () => window.Game.init());
