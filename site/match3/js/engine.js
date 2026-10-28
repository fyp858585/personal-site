/* ============================================================
 * 三消基础引擎 · 纯逻辑，无 DOM
 *
 * 规则依据《开心消消乐》的经典基础款，完整规格见 ../RULES.md
 *
 * 设计要点：
 *   1. 引擎把一整个回合算完，输出「步骤流」（steps），渲染层照着播动画；
 *   2. 棋盘上每枚棋子有唯一 id，渲染层用 id 找到自己的 DOM 节点；
 *   3. 所有随机走可克隆的种子 RNG —— 同一 seed 同一局，方便回放和测试；
 *   4. 匹配事件通过 S.onEvent 抛出，后续「规则卡」层从这里接进来。
 * ============================================================ */
(function (global) {
  'use strict';

  const W = 8, H = 8, N_COLORS = 5;

  // 棋子配色 / 名称（美术是 5 个经典形状宝石：颜色 + 轮廓双重区分）
  const COLORS = ['#ff6b5b', '#ffc93c', '#5fd97a', '#4aa8ff', '#b07cff'];
  const COLOR_NAMES = ['红', '黄', '绿', '蓝', '紫'];
  const ELEMENTS = ['圆宝石', '星星', '方糖', '三角', '菱形'];

  const SPECIALS = {
    rocketH: { name: '横向火箭', color: true },
    rocketV: { name: '纵向火箭', color: true },
    bomb: { name: '炸弹', color: true },
    rainbow: { name: '彩虹球', color: false },
  };

  // ---------------- 关卡 ----------------
  // goals: [{color:n}] 收集某色 n 个 / [{score:n}] 达到分数
  // 数值是拿贪心 bot 跑 24 局扫出来的（见 test/engine.test.js 第 ⑮ 组）：
  // bot 胜率 100/96/96/96/83/96/83/71%，人类大致要再低 15~25 个点。
  const LEVELS = [
    { id: 1, name: '初次摘果', moves: 20, goals: [{ color: 0, n: 12 }, { color: 1, n: 12 }],
      tip: '拖动相邻的两枚棋子交换，凑齐 3 个同色就能消除' },
    { id: 2, name: '双色订单', moves: 20, goals: [{ color: 2, n: 22 }, { color: 3, n: 22 }],
      tip: '连成 4 个会变成火箭：点一下它，就能清掉一整行或一整列' },
    { id: 3, name: '弯弯绕绕', moves: 22, goals: [{ color: 0, n: 19 }, { color: 4, n: 19 }, { color: 3, n: 19 }],
      tip: '拐弯的 L 形 / T 形会变成炸弹，点一下就炸掉周围 3×3' },
    { id: 4, name: '彩虹初见', moves: 20, goals: [{ color: 2, n: 26 }, { color: 1, n: 26 }],
      tip: '连成 5 个会变彩虹球：和谁交换，就消掉全场那个颜色' },
    { id: 5, name: '连消时刻', moves: 20, goals: [{ score: 4500 }],
      tip: '连消越深，每一步的分数倍率越高——别只盯着眼前的三连' },
    { id: 6, name: '五色齐全', moves: 26, goals: [{ color: 0, n: 30 }, { color: 1, n: 30 }, { color: 2, n: 30 }, { color: 3, n: 30 }, { color: 4, n: 30 }],
      tip: '五种颜色都要收。被引爆的棋子同样计入收集' },
    { id: 7, name: '大丰收', moves: 22, goals: [{ color: 4, n: 36 }, { color: 0, n: 36 }],
      tip: '两枚道具挨着换一下，会触发组合技——这是翻盘的钥匙' },
    { id: 8, name: '果园之星', moves: 24, goals: [{ score: 6000 }],
      tip: '毕业考。留步数没用，把每一步的连锁都吃满' },
  ];



  // ---------------- 工具 ----------------
  const idx = (r, c) => r * W + c;
  const inB = (r, c) => r >= 0 && r < H && c >= 0 && c < W;
  const rowOf = (i) => (i / W) | 0;
  const colOf = (i) => i % W;

  function makeRNG(seed) {
    let a = seed >>> 0;
    const rng = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    rng.getState = () => a;
    rng.setState = (s) => { a = s >>> 0; };
    rng.clone = () => { const r = makeRNG(1); r.setState(a); return r; };
    return rng;
  }

  let uid = 1;
  function newTile(color) { return { id: uid++, color, special: null }; }

  // ---------------- 棋盘生成 ----------------
  // 发牌时不允许已经三连，并且保证至少有一步可行
  function pickColor(board, r, c) {
    const bad = [];
    if (c >= 2) {
      const a = board[idx(r, c - 1)], b = board[idx(r, c - 2)];
      if (a && b && a.color != null && a.color === b.color) bad.push(a.color);
    }
    if (r >= 2) {
      const a = board[idx(r - 1, c)], b = board[idx(r - 2, c)];
      if (a && b && a.color != null && a.color === b.color) bad.push(a.color);
    }
    const pool = [];
    for (let k = 0; k < N_COLORS; k++) if (bad.indexOf(k) < 0) pool.push(k);
    return pool.length ? pool : [0, 1, 2, 3, 4];
  }

  function createGame(level, seed) {
    uid = 1;
    seed = seed >>> 0;
    for (let attempt = 0; attempt < 200; attempt++) {
      const rng = makeRNG(seed + attempt * 7919);
      const board = new Array(W * H);
      for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
          const pool = pickColor(board, r, c);
          board[idx(r, c)] = newTile(pool[(rng() * pool.length) | 0]);
        }
      }
      const S = {
        level, board, seed: seed + attempt * 7919,
        moves: level.moves, movesTotal: level.moves,
        score: 0, collected: [0, 0, 0, 0, 0],
        maxChain: 0, specialsMade: 0, rng, onEvent: null,
      };
      if (findMatches(board).length) continue;
      if (!hasAnyMove(S)) continue;
      return S;
    }
    throw new Error('无法生成棋盘');
  }

  // ---------------- 匹配检测 ----------------
  function collectRuns(board) {
    const runs = [];
    for (let r = 0; r < H; r++) {
      let c = 0;
      while (c < W) {
        const t = board[idx(r, c)];
        if (!t || t.color == null) { c++; continue; }
        let e = c + 1;
        while (e < W) {
          const n = board[idx(r, e)];
          if (!n || n.color !== t.color) break;
          e++;
        }
        if (e - c >= 3) {
          const cells = [];
          for (let k = c; k < e; k++) cells.push(idx(r, k));
          runs.push({ dir: 'h', color: t.color, len: e - c, cells });
        }
        c = Math.max(e, c + 1);
      }
    }
    for (let c = 0; c < W; c++) {
      let r = 0;
      while (r < H) {
        const t = board[idx(r, c)];
        if (!t || t.color == null) { r++; continue; }
        let e = r + 1;
        while (e < H) {
          const n = board[idx(e, c)];
          if (!n || n.color !== t.color) break;
          e++;
        }
        if (e - r >= 3) {
          const cells = [];
          for (let k = r; k < e; k++) cells.push(idx(k, c));
          runs.push({ dir: 'v', color: t.color, len: e - r, cells });
        }
        r = Math.max(e, r + 1);
      }
    }
    return runs;
  }

  // 同色、共格的 run 合并成「一组」，组才是判定特殊棋子的单位
  function findMatches(board) {
    const runs = collectRuns(board);
    if (!runs.length) return [];
    const parent = new Map();
    const find = (x) => {
      while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); }
      return x;
    };
    const union = (a, b) => {
      const ra = find(a), rb = find(b);
      if (ra !== rb) parent.set(ra, rb);
    };
    for (const run of runs) for (const c of run.cells) if (!parent.has(c)) parent.set(c, c);
    for (const run of runs) for (let k = 1; k < run.cells.length; k++) union(run.cells[0], run.cells[k]);

    const groups = new Map();
    for (const run of runs) {
      const root = find(run.cells[0]);
      if (!groups.has(root)) groups.set(root, { cells: new Set(), runs: [], color: run.color });
      const g = groups.get(root);
      for (const c of run.cells) g.cells.add(c);
      g.runs.push(run);
    }
    const out = [];
    for (const g of groups.values()) {
      const hasH = g.runs.some((r) => r.dir === 'h');
      const hasV = g.runs.some((r) => r.dir === 'v');
      const best = g.runs.reduce((a, b) => (b.len > a.len ? b : a));
      out.push({
        color: g.color,
        cells: [...g.cells].sort((a, b) => a - b),
        runs: g.runs,
        hasH, hasV,
        maxLen: best.len,
        dir: best.dir,
        shape: (hasH && hasV) ? 'corner' : 'line',
      });
    }
    out.sort((a, b) => a.cells[0] - b.cells[0]);
    return out;
  }

  // 某个格子是否处在一条 ≥3 的连线上（只检查过它的横竖两条）
  function matchAt(board, i) {
    const t = board[i];
    if (!t || t.color == null) return false;
    const r = rowOf(i), c = colOf(i);
    let n = 1;
    for (let k = c - 1; k >= 0; k--) { const q = board[idx(r, k)]; if (!q || q.color !== t.color) break; n++; }
    for (let k = c + 1; k < W; k++) { const q = board[idx(r, k)]; if (!q || q.color !== t.color) break; n++; }
    if (n >= 3) return true;
    n = 1;
    for (let k = r - 1; k >= 0; k--) { const q = board[idx(k, c)]; if (!q || q.color !== t.color) break; n++; }
    for (let k = r + 1; k < H; k++) { const q = board[idx(k, c)]; if (!q || q.color !== t.color) break; n++; }
    return n >= 3;
  }

  // ---------------- 特殊棋子 ----------------
  // 4 连直线 → 沿连线方向飞的火箭；L/T → 炸弹；5 连 → 彩虹球
  function specialFor(group) {
    if (group.maxLen >= 5) return 'rainbow';
    if (group.hasH && group.hasV) return 'bomb';
    if (group.maxLen === 4) return group.dir === 'h' ? 'rocketH' : 'rocketV';
    return null;
  }

  // 特殊棋子落在哪里：优先玩家刚动过的那一格
  function pickSpawn(group, prefer) {
    if (prefer) for (const c of prefer) if (group.cells.indexOf(c) >= 0) return c;
    if (group.hasH && group.hasV) {
      const hs = new Set();
      for (const run of group.runs) if (run.dir === 'h') for (const c of run.cells) hs.add(c);
      for (const run of group.runs) if (run.dir === 'v') for (const c of run.cells) if (hs.has(c)) return c;
    }
    const best = group.runs.reduce((a, b) => (b.len > a.len ? b : a));
    return best.cells[(best.len / 2) | 0];
  }

  // 彩虹球没指定颜色时（被点击 / 被连锁引爆）打哪一色：场上数量最多的那种
  function rainbowTarget(S) {
    const cnt = new Array(N_COLORS).fill(0);
    for (let i = 0; i < W * H; i++) { const q = S.board[i]; if (q && q.color != null) cnt[q.color]++; }
    let best = -1;
    for (let k = 0; k < N_COLORS; k++) {
      if (cnt[k] > 0 && (best < 0 || cnt[k] > cnt[best])) best = k;
    }
    return best < 0 ? null : best;
  }

  function blastCells(S, cell) {
    const t = S.board[cell];
    if (!t || !t.special) return [];
    const r = rowOf(cell), c = colOf(cell);
    const out = [];
    if (t.special === 'rocketH') {
      for (let k = 0; k < W; k++) out.push(idx(r, k));
    } else if (t.special === 'rocketV') {
      for (let k = 0; k < H; k++) out.push(idx(k, c));
    } else if (t.special === 'bomb') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) if (inB(r + dr, c + dc)) out.push(idx(r + dr, c + dc));
      }
    } else if (t.special === 'rainbow') {
      const best = rainbowTarget(S);
      for (let i = 0; i < W * H; i++) { const q = S.board[i]; if (q && q.color === best) out.push(i); }
      out.push(cell);
    }
    return out;
  }

  // 道具发动时飘出来的那行字
  function specialLabel(S, cell) {
    const t = S.board[cell];
    if (!t || !t.special) return '';
    if (t.special === 'rocketH') return '火箭 · 横扫整行';
    if (t.special === 'rocketV') return '火箭 · 竖穿整列';
    if (t.special === 'bomb') return '炸弹 · 周围九格';
    const k = rainbowTarget(S);
    return k == null ? '彩虹球 · 全场清空' : `彩虹球 · 消除全部${COLOR_NAMES[k]}色`;
  }

  // 连锁引爆：被清掉的格子里如果有特殊棋子，就继续扩散
  function expandBlasts(S, seeds, steps, protect) {
    const cleared = new Set(seeds);
    const done = new Set();
    const queue = [...seeds].filter((i) => S.board[i] && S.board[i].special);
    while (queue.length) {
      const cell = queue.shift();
      if (done.has(cell)) continue;
      const t = S.board[cell];
      if (!t || !t.special) continue;
      done.add(cell);
      const cells = blastCells(S, cell);
      steps.push({ t: 'blast', source: cell, special: t.special, cells });
      for (const c of cells) {
        const q = S.board[c];
        if (!q) continue;
        if (protect && protect.has(c)) continue;
        if (!cleared.has(c)) {
          cleared.add(c);
          if (q.special && !done.has(c)) queue.push(c);
        }
      }
    }
    return cleared;
  }

  // ---------------- 重力 / 补充 ----------------
  // 新掉下来的棋子不能立刻凑成三连。
  // 这是三消手感的关键：不拦的话，8×8/5 色每补一次牌平均会凭空多出 4 组三连，
  // 一步能连消 8 层、清掉 27 个棋子——玩家看起来就是“棋盘自己炸了”。
  // 只拦「新生成的棋子」，落下来重新排布的老棋子照常可以连消。
  function spawnColor(board, r, c, rng) {
    const bad = [];
    const l1 = c >= 1 ? board[idx(r, c - 1)] : null;
    const l2 = c >= 2 ? board[idx(r, c - 2)] : null;
    if (l1 && l2 && l1.color != null && l1.color === l2.color) bad.push(l1.color);
    const d1 = r + 1 < H ? board[idx(r + 1, c)] : null;
    const d2 = r + 2 < H ? board[idx(r + 2, c)] : null;
    if (d1 && d2 && d1.color != null && d1.color === d2.color) bad.push(d1.color);
    const pool = [];
    for (let k = 0; k < N_COLORS; k++) if (bad.indexOf(k) < 0) pool.push(k);
    const pick = pool.length ? pool : [0, 1, 2, 3, 4];
    return pick[(rng() * pick.length) | 0];
  }

  function fallStep(S) {
    const moves = [], spawns = [];
    for (let c = 0; c < W; c++) {
      let write = H - 1;
      for (let r = H - 1; r >= 0; r--) {
        const i = idx(r, c);
        const t = S.board[i];
        if (!t) continue;
        if (write !== r) {
          S.board[idx(write, c)] = t;
          S.board[i] = null;
          moves.push({ id: t.id, from: i, to: idx(write, c) });
        }
        write--;
      }
      for (let r = write; r >= 0; r--) {
        const color = spawnColor(S.board, r, c, S.rng);
        const t = newTile(color);
        S.board[idx(r, c)] = t;
        spawns.push({ id: t.id, color, to: idx(r, c) });
      }
    }
    if (!moves.length && !spawns.length) return [];
    return [{ t: 'fall', moves, spawns }];
  }

  // ---------------- 可行性 / 提示 / 洗牌 ----------------
  // 只要有一方是道具，这次交换就是「发动道具」，不需要凑三连
  function isSpecialSwap(t1, t2) {
    return !!((t1 && t1.special) || (t2 && t2.special));
  }

  function anyMove(board) {
    const tmp = board.slice();
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const i = idx(r, c);
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const r2 = r + dr, c2 = c + dc;
          if (!inB(r2, c2)) continue;
          const j = idx(r2, c2);
          if (!tmp[i] || !tmp[j]) continue;
          tmp[i] = board[j]; tmp[j] = board[i];
          const ok = matchAt(tmp, i) || matchAt(tmp, j);
          tmp[i] = board[i]; tmp[j] = board[j];
          if (ok) return [i, j];
        }
      }
    }
    return null;
  }

  function hasAnyMove(S) {
    // 场上有道具就一定有棋可走：点一下就能发动
    for (let i = 0; i < W * H; i++) if (S.board[i] && S.board[i].special) return true;
    return anyMove(S.board) !== null;
  }

  function findHint(S) {
    const all = [];
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const i = idx(r, c);
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const r2 = r + dr, c2 = c + dc;
          if (!inB(r2, c2)) continue;
          const j = idx(r2, c2);
          if (isSpecialSwap(S.board[i], S.board[j])) { all.push([i, j]); continue; }
          const b = S.board.slice();
          b[i] = S.board[j]; b[j] = S.board[i];
          if (matchAt(b, i) || matchAt(b, j)) all.push([i, j]);
        }
      }
    }
    if (!all.length) return null;
    return all[(S.rng() * all.length) | 0];
  }

  // 洗牌：只重排普通棋子的颜色，特殊棋子留在原地
  function shuffle(S) {
    const normal = [];
    for (let i = 0; i < W * H; i++) {
      const t = S.board[i];
      if (t && !t.special) normal.push(i);
    }
    if (normal.length < 4) return false;
    // 优先整体打乱颜色，而不是反复重试整个棋盘
    const colors = normal.map((i) => S.board[i].color);
    for (let attempt = 0; attempt < 80; attempt++) {
      for (let i = colors.length - 1; i > 0; i--) {
        const j = (S.rng() * (i + 1)) | 0;
        const tmp = colors[i]; colors[i] = colors[j]; colors[j] = tmp;
      }
      normal.forEach((cell, k) => { S.board[cell].color = colors[k]; });
      if (findMatches(S.board).length) continue;
      if (!anyMove(S.board)) continue;
      return true;
    }
    return false;
  }

  function settle(S, steps) {
    if (hasAnyMove(S)) return false;
    const ok = shuffle(S);
    if (ok) {
      steps.push({
        t: 'shuffle',
        text: '没有可走的步了，重新排列',
        assign: S.board.map((t, i) => (t ? { id: t.id, color: t.color, special: t.special, cell: i } : null)).filter(Boolean),
      });
    }
    return ok;
  }

  // ---------------- 回合结算 ----------------
  function clearTiles(S, cells) {
    for (const c of cells) {
      const t = S.board[c];
      if (!t) continue;
      if (t.color != null) S.collected[t.color]++;
      S.board[c] = null;
    }
  }

  function chainLoop(S, steps, prefer) {
    let chain = 0;
    let pending = prefer || [];
    for (;;) {
      const groups = findMatches(S.board);
      if (!groups.length) break;
      chain++;
      S.maxChain = Math.max(S.maxChain, chain);
      if (S.onEvent) for (const g of groups) S.onEvent({ type: 'match', group: g, chain, S });

      steps.push({
        t: 'match', chain,
        groups: groups.map((g) => ({ cells: g.cells, color: g.color, shape: g.shape, len: g.maxLen, dir: g.dir })),
      });

      // 只有玩家这一步亲手造成的匹配才生产特殊棋子；连消不生产
      const spawns = [];
      if (chain === 1) {
        for (const g of groups) {
          const sp = specialFor(g);
          if (sp) spawns.push({ cell: pickSpawn(g, pending), special: sp, group: g });
        }
      }
      const protect = new Set(spawns.map((s) => s.cell));

      for (const s of spawns) {
        const t = S.board[s.cell];
        if (!t) continue;
        t.special = s.special;
        if (s.special === 'rainbow') t.color = null;
        S.specialsMade++;
        S.score += 20;
        steps.push({ t: 'spawn', cell: s.cell, id: t.id, special: s.special, color: t.color });
      }

      const seeds = [];
      for (const g of groups) for (const c of g.cells) if (!protect.has(c)) seeds.push(c);

      const cleared = expandBlasts(S, seeds, steps, protect);
      let pts = 0;
      const cellsInfo = [];
      for (const c of cleared) {
        const t = S.board[c];
        if (!t) continue;
        pts += 10 * chain;
        if (t.special) pts += 10 * chain; // 特殊棋子本身更值钱
        cellsInfo.push({ i: c, id: t.id, color: t.color, special: t.special });
      }
      S.score += pts;
      steps.push({ t: 'clear', chain, points: pts, cells: cellsInfo });
      clearTiles(S, cleared);
      steps.push(...fallStep(S));
      pending = [];
    }
    return chain;
  }

  // 在 seeds 上引爆（含连锁扩散），结算分数并清场
  function burst(S, seeds, steps, label, chain) {
    steps.push({ t: 'combo', a: seeds[0], b: seeds[0], text: label });
    const cleared = expandBlasts(S, seeds, steps);
    let pts = 0;
    const info = [];
    for (const c of cleared) {
      const t = S.board[c];
      if (!t) continue;
      pts += 10 * chain;
      if (t.special) pts += 10 * chain;
      info.push({ i: c, id: t.id, color: t.color, special: t.special });
    }
    S.score += pts;
    steps.push({ t: 'clear', chain, points: pts, cells: info });
    clearTiles(S, cleared);
    steps.push(...fallStep(S));
    return cleared;
  }

  // 道具换到相邻格：只要有一方是道具就是有效操作，当场发动
  //   - 道具 + 普通       → 道具在新位置上发动（彩虹球则清掉对方那个颜色）
  //   - 两个道具          → 组合技
  function comboMove(S, t1, t2, a, b, steps) {
    const s1 = t1.special, s2 = t2.special;
    const r1 = s1 === 'rainbow', r2 = s2 === 'rainbow';
    let label = '';
    let seeds = [a, b];

    if (r1 && r2) {
      label = '彩虹球 × 彩虹球 · 全场清空';
      for (let i = 0; i < W * H; i++) if (S.board[i]) seeds.push(i);
    } else if (r1 || r2) {
      const other = r1 ? t2 : t1;
      const color = other.color;
      label = color == null ? '彩虹球 · 全场清空' : `彩虹球 · 消除全部${COLOR_NAMES[color]}色`;
      for (let i = 0; i < W * H; i++) { const t = S.board[i]; if (t && t.color === color) seeds.push(i); }
    } else if (s1 && s2) {
      const rs = (s1[0] === 'r') + (s2[0] === 'r');
      const rb = (s1[0] === 'b') + (s2[0] === 'b');
      const r = rowOf(a), c = colOf(a);
      if (rs === 2) {
        label = '火箭 × 火箭 · 十字爆破';
        for (let k = 0; k < W; k++) seeds.push(idx(r, k));
        for (let k = 0; k < H; k++) seeds.push(idx(k, c));
      } else if (rs === 1 && rb === 1) {
        label = '火箭 × 炸弹 · 三行三列';
        for (let dr = -1; dr <= 1; dr++) if (inB(r + dr, c)) for (let k = 0; k < W; k++) seeds.push(idx(r + dr, k));
        for (let dc = -1; dc <= 1; dc++) if (inB(r, c + dc)) for (let k = 0; k < H; k++) seeds.push(idx(k, c + dc));
      } else {
        label = '炸弹 × 炸弹 · 大爆炸';
        for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
          if (inB(r + dr, c + dc)) seeds.push(idx(r + dr, c + dc));
        }
      }
    } else {
      // 单个火箭 / 炸弹：在它被换到的新格子上发动，所以拖动方向就是瞄准方向
      const center = s1 ? b : a;
      seeds = [center];
      label = specialLabel(S, center);
    }

    burst(S, seeds, steps, label, 1);
    chainLoop(S, steps, []);
    settle(S, steps);
    return { invalid: false, steps };
  }

  // 直接点一下道具：当场发动，消耗 1 步
  function resolveTap(S, cell) {
    const t = S.board[cell];
    if (!t || !t.special) return { invalid: true, none: true, steps: [] };
    const steps = [];
    S.moves--;
    burst(S, [cell], steps, specialLabel(S, cell), 1);
    chainLoop(S, steps, []);
    settle(S, steps);
    return { invalid: false, steps };
  }

  /**
   * 玩家交换两个相邻棋子（a、b 是格子下标）
   * 返回 { invalid, steps }；invalid 时棋盘已还原、不消耗步数
   * 只要有一方是道具，交换就直接发动道具，不需要凑三连。
   */
  function resolveMove(S, a, b) {
    const steps = [];
    const t1 = S.board[a], t2 = S.board[b];
    if (!t1 || !t2) return { invalid: true, steps };

    const swapRaw = () => {
      S.board[a] = t2; S.board[b] = t1;
    };

    // 1) 道具（火箭 / 炸弹 / 彩虹球）一换就炸
    if (isSpecialSwap(t1, t2)) {
      swapRaw();
      steps.push({ t: 'swap', a, b });
      S.moves--;
      return comboMove(S, t1, t2, a, b, steps);
    }

    // 2) 普通交换：先换，看有没有匹配
    swapRaw();
    steps.push({ t: 'swap', a, b });
    if (!findMatches(S.board).length) {
      S.board[a] = t1; S.board[b] = t2;
      steps.push({ t: 'revert', a, b });
      return { invalid: true, steps };
    }

    S.moves--;
    chainLoop(S, steps, [a, b]);
    settle(S, steps);
    return { invalid: false, steps };
  }

  // ---------------- 目标 / 结算 ----------------
  function goalProgress(S) {
    return S.level.goals.map((g) => {
      if (g.score != null) return { kind: 'score', need: g.score, have: S.score, done: S.score >= g.score };
      return { kind: 'color', color: g.color, need: g.n, have: S.collected[g.color], done: S.collected[g.color] >= g.n };
    });
  }
  function isWin(S) { return goalProgress(S).every((g) => g.done); }
  function isLose(S) { return !isWin(S) && S.moves <= 0; }

  function starsFor(level, S) {
    if (!isWin(S)) return 0;
    const scoreGoal = level.goals.find((g) => g.score != null);
    if (scoreGoal) {
      const r = S.score / scoreGoal.score;
      return r >= 1.6 ? 3 : r >= 1.25 ? 2 : 1;
    }
    const ratio = S.moves / level.moves;
    return ratio >= 0.25 ? 3 : ratio >= 0.08 ? 2 : 1;
  }

  function goalText(level) {
    return level.goals.map((g) => (g.score != null ? `${g.score} 分` : `${COLOR_NAMES[g.color]}色 ×${g.n}`)).join(' · ');
  }

  // ---------------- 深拷贝（测试 / bot 用） ----------------
  function cloneGame(S) {
    return {
      level: S.level,
      board: S.board.map((t) => (t ? { id: t.id, color: t.color, special: t.special } : null)),
      moves: S.moves, movesTotal: S.movesTotal,
      score: S.score, collected: S.collected.slice(),
      maxChain: S.maxChain, specialsMade: S.specialsMade,
      rng: S.rng.clone(), seed: S.seed, onEvent: null,
    };
  }

  // 贪心 bot：只用来校准关卡数值、跑回归测试
  function botMove(S, rng) {
    const cands = [];
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const i = idx(r, c);
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          if (!inB(r + dr, c + dc)) continue;
          cands.push([i, idx(r + dr, c + dc)]);
        }
      }
    }
    let best = null, bestScore = -1e9;
    for (const [a, b] of cands) {
      const sim = cloneGame(S);
      const res = resolveMove(sim, a, b);
      if (res.invalid) continue;
      let sc = (sim.score - S.score) * 0.05;
      for (const g of S.level.goals) {
        if (g.score != null) continue;
        const gain = sim.collected[g.color] - S.collected[g.color];
        const remain = Math.max(0, g.n - S.collected[g.color]);
        sc += gain * (remain > 0 ? 10 : 1);
      }
      sc += (sim.maxChain - S.maxChain) * 3;
      if (sc > bestScore) { bestScore = sc; best = [a, b]; }
    }
    return best;
  }

  // 「随手玩」玩家模型：每一步随机挑一个合法走法（不盯目标颜色）
  // 用来量出关卡难度的下界：这个模型能过，说明对人类足够宽松
  function simulateCasual(levelIdx, seed) {
    const level = LEVELS[levelIdx];
    const S = createGame(level, seed);
    for (let step = 0; step < 120; step++) {
      if (isWin(S) || S.moves <= 0) break;
      const mv = findHint(S);
      if (!mv) break;
      const res = resolveMove(S, mv[0], mv[1]);
      if (res.invalid) break;
    }
    return { win: isWin(S), stars: starsFor(level, S), score: S.score, movesLeft: S.moves };
  }

  function simulate(levelIdx, seed) {
    const level = LEVELS[levelIdx];
    const S = createGame(level, seed);
    for (let step = 0; step < 120; step++) {
      if (isWin(S)) break;
      if (S.moves <= 0) break;
      const mv = botMove(S);
      if (!mv) break;
      const res = resolveMove(S, mv[0], mv[1]);
      if (res.invalid) break;
    }
    return { win: isWin(S), stars: starsFor(level, S), score: S.score, movesLeft: S.moves };
  }

  // 造一个指定颜色的棋盘（测试 / 关卡编辑器用）
  function boardFromColors(colors) {
    return colors.map((c) => (c == null ? null : newTile(c)));
  }

  const API = {
    W, H, N_COLORS, COLORS, COLOR_NAMES, ELEMENTS, SPECIALS, LEVELS,
    idx, inB, rowOf, colOf, newTile, boardFromColors,
    makeRNG, createGame, findMatches, matchAt, specialFor, pickSpawn, blastCells,
    resolveMove, resolveTap, hasAnyMove, findHint, shuffle, settle, goalProgress,
    isWin, isLose, starsFor, goalText, cloneGame, botMove, simulate, simulateCasual,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  global.M3 = API;
})(typeof window !== 'undefined' ? window : globalThis);
