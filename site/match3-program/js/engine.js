/* ============================================================
 * 编程三消 · 引擎（纯逻辑，零 DOM，可 require 进 node）
 *
 * 基础盘面沿用 ../basic/js/engine.js 的手感与匹配规则；
 * 这一版把「特殊棋子怎么生成」从写死的四行，变成一张
 * 玩家可编辑的规则表：
 *
 *   ① 当【玩家消除】且【连数 ≥ 5】            → 【生成彩虹球】
 *   ② 当【玩家消除】且【形状 = 折角】          → 【生成炸弹】
 *   ③ 当【玩家消除】且【连数 ≥ 4】            → 【生成火箭】
 *   ④ 当【每步开始】 且【剩余步数 ≤ 5】        → 【随机一枚变炸弹】
 *
 * 执行语义 = if / elif / else：
 *   同一事件下，从上到下检查；第一条「触发器匹配 + 条件全真」的规则执行，
 *   后面的规则不再检查（除非它属于另一个事件类型）。
 *
 * 一切结算输出「步骤流」steps，渲染层照着播；测试直接断言 steps。
 * ============================================================ */
(function (global) {
  'use strict';

  const W = 8, H = 8, N_COLORS = 5, MAX_RULES = 4;
  const BONUS_AMT = 150;
  const SPAWN_SCORE = 20;

  const COLORS = ['#ff6b5b', '#ffc93c', '#5fd97a', '#4aa8ff', '#b07cff'];
  const COLOR_NAMES = ['红', '黄', '绿', '蓝', '紫'];
  const ELEMENTS = ['圆宝石', '星星', '方糖', '三角', '菱形'];

  const SPECIALS = {
    rocketH: { name: '横向火箭' },
    rocketV: { name: '纵向火箭' },
    bomb: { name: '炸弹' },
    rainbow: { name: '彩虹球' },
  };

  // ============================================================
  // 词表：触发器 / 条件 / 动作
  // 每一项都带 cost —— 这一版只显示、不设硬上限，留给下一步做预算。
  // ============================================================
  const TRIGGERS = {
    player: { id: 'player', label: '玩家消除', short: '玩家', hint: '本回合第一次匹配时检查', cost: 0 },
    cascade: { id: 'cascade', label: '连消', short: '连消', hint: '第 2 层及以后每次匹配时检查', cost: 1 },
    turn: { id: 'turn', label: '每步开始', short: '每步', hint: '一步成立后、消除结算前检查', cost: 1 },
  };

  const CONDS = {
    min3: { id: 'min3', label: '连数 ≥ 3', cost: 1, type: 'minCount', v: 3 },
    min4: { id: 'min4', label: '连数 ≥ 4', cost: 1, type: 'minCount', v: 4 },
    min5: { id: 'min5', label: '连数 ≥ 5', cost: 1, type: 'minCount', v: 5 },
    line: { id: 'line', label: '形状 = 直线', cost: 1, type: 'shape', v: 'line' },
    corner: { id: 'corner', label: '形状 = 折角', cost: 1, type: 'shape', v: 'corner' },
    horiz: { id: 'horiz', label: '方向 = 横向', cost: 1, type: 'orient', v: 'h' },
    vert: { id: 'vert', label: '方向 = 纵向', cost: 1, type: 'orient', v: 'v' },
    c0: { id: 'c0', label: '颜色 = 红', cost: 1, type: 'color', v: 0 },
    c1: { id: 'c1', label: '颜色 = 黄', cost: 1, type: 'color', v: 1 },
    c2: { id: 'c2', label: '颜色 = 绿', cost: 1, type: 'color', v: 2 },
    c3: { id: 'c3', label: '颜色 = 蓝', cost: 1, type: 'color', v: 3 },
    c4: { id: 'c4', label: '颜色 = 紫', cost: 1, type: 'color', v: 4 },
    casc2: { id: 'casc2', label: '连消 ≥ 2 层', cost: 2, type: 'minChain', v: 2 },
    casc3: { id: 'casc3', label: '连消 ≥ 3 层', cost: 2, type: 'minChain', v: 3 },
    low5: { id: 'low5', label: '剩余步数 ≤ 5', cost: 1, type: 'movesLeft', v: 5 },
    low8: { id: 'low8', label: '剩余步数 ≤ 8', cost: 1, type: 'movesLeft', v: 8 },
  };

  // 按触发器做「类型检查」：每条规则只能选语义成立的条件。
  //   每步开始时没有匹配组 → 只留「剩余步数」
  //   玩家消除时连消层数恒为 1 → 不留「连消」
  const CONDS_FOR = {
    player: ['min3', 'min4', 'min5', 'line', 'corner', 'horiz', 'vert', 'c0', 'c1', 'c2', 'c3', 'c4', 'low5', 'low8'],
    cascade: ['min3', 'min4', 'min5', 'line', 'corner', 'horiz', 'vert', 'c0', 'c1', 'c2', 'c3', 'c4', 'casc2', 'casc3', 'low5', 'low8'],
    turn: ['low5', 'low8'],
  };

  const ACTIONS = {
    rocket: { id: 'rocket', label: '生成火箭', verb: '生成火箭', cost: 1, type: 'rocket', hint: '沿消除方向清一行 / 一列' },
    bomb: { id: 'bomb', label: '生成炸弹', verb: '生成炸弹', cost: 2, type: 'bomb', hint: '炸开周围 3×3' },
    rainbow: { id: 'rainbow', label: '生成彩虹球', verb: '生成彩虹球', cost: 3, type: 'rainbow', hint: '换成任意棋子，清空全场该色' },
    bonus: { id: 'bonus', label: `+${BONUS_AMT} 分`, verb: `+${BONUS_AMT} 分`, cost: 2, type: 'bonus', hint: '这次匹配立刻加分' },
    randbomb: { id: 'randbomb', label: '随机一枚变炸弹', verb: '随机一枚变炸弹', cost: 3, type: 'randbomb', hint: '场上任意一枚普通棋子变炸弹，不占匹配格' },
  };

  const ACTIONS_FOR = {
    player: ['rocket', 'bomb', 'rainbow', 'bonus', 'randbomb'],
    cascade: ['rocket', 'bomb', 'rainbow', 'bonus', 'randbomb'],
    turn: ['randbomb', 'bonus'],
  };

  const EMPTY_RULE = Object.freeze({ on: false, trigger: 'player', c1: null, c2: null, action: null });

  function emptyRule(trigger) {
    return { on: false, trigger: trigger || 'player', c1: null, c2: null, action: null };
  }

  function makeRule(trigger, c1, c2, action) {
    return { on: true, trigger: trigger || 'player', c1: c1 || null, c2: c2 || null, action: action || 'bonus' };
  }

  // 出厂固件 = 经典三消的四行硬编码
  function defaultProgram() {
    return [
      makeRule('player', 'min5', null, 'rainbow'),
      makeRule('player', 'corner', null, 'bomb'),
      makeRule('player', 'min4', null, 'rocket'),
      emptyRule('turn'),
    ];
  }

  function normalizeProgram(p) {
    const out = [];
    for (let i = 0; i < MAX_RULES; i++) {
      const r = p && p[i];
      if (!r) { out.push(emptyRule('player')); continue; }
      const trigger = TRIGGERS[r.trigger] ? r.trigger : 'player';
      const allowedC = CONDS_FOR[trigger];
      const actionOK = r.action == null || !!(ACTIONS[r.action] && ACTIONS_FOR[trigger].indexOf(r.action) >= 0);
      out.push({
        on: !!(r.on && r.action && actionOK),
        trigger,
        c1: allowedC.indexOf(r.c1) >= 0 ? r.c1 : null,
        c2: allowedC.indexOf(r.c2) >= 0 ? r.c2 : null,
        action: actionOK && r.action ? r.action : null,
      });
    }
    return out;
  }

  function cloneProgram(p) { return normalizeProgram(p).map((r) => ({ ...r })); }

  function ruleCost(rule) {
    if (!rule || !rule.on || !rule.action) return 0;
    let c = (TRIGGERS[rule.trigger] || TRIGGERS.player).cost;
    if (rule.c1 && CONDS[rule.c1]) c += CONDS[rule.c1].cost;
    if (rule.c2 && CONDS[rule.c2]) c += CONDS[rule.c2].cost;
    if (ACTIONS[rule.action]) c += ACTIONS[rule.action].cost;
    return c;
  }

  function programCost(p) {
    return (p || []).reduce((s, r) => s + ruleCost(r), 0);
  }

  function ruleText(rule) {
    if (!rule || !rule.on || !rule.action) return '空规则';
    const t = TRIGGERS[rule.trigger] || TRIGGERS.player;
    const parts = [CONDS[rule.c1] && CONDS[rule.c1].label, CONDS[rule.c2] && CONDS[rule.c2].label].filter(Boolean);
    return `当${t.label}${parts.length ? ' 且 ' + parts.join(' 且 ') : ''} → ${ACTIONS[rule.action].label}`;
  }

  // ============================================================
  // 关卡
  // ============================================================
  const LEVELS = [
    {
      id: 1, name: '初次编程', tag: '改一条规则',
      moves: 22,
      goals: [{ color: 0, n: 16 }, { color: 1, n: 16 }],
      ice: null,
      tip: '右边是你的程序。试着把 ③ 的「生成火箭」改成「生成炸弹」——同样一次 4 连，产物就变了。',
      rec: null,
    },
    {
      id: 2, name: '连消工厂', tag: '只比分数',
      moves: 18,
      goals: [{ score: 4500 }],
      ice: null,
      tip: '这一关只比分数。把 ④ 改成「当连消 → +150 分」试试：连消越深，加分越多。',
      rec: 'score',
    },
    {
      id: 3, name: '冰封仓库', tag: '砸冰',
      moves: 20,
      goals: [{ color: 3, n: 14 }],
      ice: { rows: [1, 2, 3, 4, 5, 6] },
      tip: '冰面只能被消除或爆炸砸开。写一条「当每步开始 → 随机一枚变炸弹」，不消除也能破冰。',
      rec: 'ice',
    },
    {
      id: 4, name: '自由工坊', tag: '沙盒',
      moves: 99,
      goals: [],
      ice: null,
      sandbox: true,
      tip: '随便改。改完点「重开本盘」，同一个棋盘会用新程序重来，差别一眼可见。',
      rec: null,
    },
  ];

  // 预置程序：给不想从零想的玩家一个「抄作业」的起点
  const RECIPES = {
    score: [
      makeRule('cascade', 'casc2', null, 'bonus'),
      makeRule('player', 'min5', null, 'rainbow'),
      makeRule('player', 'corner', null, 'bomb'),
      makeRule('player', 'min4', null, 'rocket'),
    ],
    ice: [
      makeRule('turn', null, null, 'randbomb'),
      makeRule('player', 'min5', null, 'rainbow'),
      makeRule('player', 'corner', null, 'bomb'),
      makeRule('player', 'min4', null, 'rocket'),
    ],
  };

  function levelFor(idx) { return LEVELS[idx] || LEVELS[0]; }

  function iceCells(kind) {
    const out = [];
    if (!kind) return out;
    if (kind === 'all') { for (let i = 0; i < W * H; i++) out.push(i); return out; }
    if (kind.rows) {
      for (const r of kind.rows) {
        if (r < 0 || r >= H) continue;
        for (let c = 0; c < W; c++) out.push(idx(r, c));
      }
    }
    if (kind.cols) {
      for (const c of kind.cols) {
        if (c < 0 || c >= W) continue;
        for (let r = 0; r < H; r++) out.push(idx(r, c));
      }
    }
    return [...new Set(out)];
  }

  // ============================================================
  // 工具
  // ============================================================
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
  function newTile(color) { return { id: uid++, color, special: null, origin: null }; }

  // ============================================================
  // 发牌
  // ============================================================
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

  function createGame(level, seed, program) {
    uid = 1;
    seed = seed >>> 0;
    const ice = new Array(W * H).fill(0);
    for (const i of iceCells(level.ice)) ice[i] = 1;
    const iceTotal = ice.reduce((a, b) => a + b, 0);

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
        level, board, seed: seed + attempt * 7919, ice, iceTotal,
        moves: level.moves, movesTotal: level.moves,
        score: 0, collected: [0, 0, 0, 0, 0],
        maxChain: 0, specialsMade: 0, rulesFired: 0,
        rng, program: cloneProgram(program || defaultProgram()),
      };
      if (findMatches(board).length) continue;
      if (!hasAnyMove(S)) continue;
      return S;
    }
    throw new Error('无法生成棋盘');
  }

  // ============================================================
  // 匹配检测（与基础款一致：组是判定单位）
  // ============================================================
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

  // ============================================================
  // 规则求值
  // ============================================================
  function condFails(cond, ev, S) {
    const c = CONDS[cond];
    if (!c) return '未知条件';
    switch (c.type) {
      case 'minCount': return ev.maxRun >= c.v ? null : `连数 ≥ ${c.v}（实际 ${ev.maxRun}）`;
      case 'shape': return ev.shape === c.v ? null : `形状 = ${c.v === 'line' ? '直线' : '折角'}（实际 ${ev.shape === 'line' ? '直线' : '折角'}）`;
      case 'orient': {
        const actual = ev.hasH && ev.hasV ? '横竖交叉' : ev.hasH ? '横向' : ev.hasV ? '纵向' : '无';
        const want = c.v === 'h' ? '横向' : '纵向';
        return (c.v === 'h' ? (ev.hasH && !ev.hasV) : (ev.hasV && !ev.hasH)) ? null : `方向 = ${want}（实际 ${actual}）`;
      }
      case 'color': return ev.color === c.v ? null : `颜色 = ${COLOR_NAMES[c.v]}（实际 ${ev.color >= 0 ? COLOR_NAMES[ev.color] : '无'}）`;
      case 'minChain': return ev.chain >= c.v ? null : `连消 ≥ ${c.v} 层（实际 ${ev.chain}）`;
      case 'movesLeft': return S.moves <= c.v ? null : `剩余步数 ≤ ${c.v}（实际 ${S.moves}）`;
      default: return '未知条件';
    }
  }

  function ruleApplies(rule, ev) {
    if (!rule || !rule.on || !rule.action) return false;
    if (ev.kind === 'turn') return rule.trigger === 'turn';
    if (rule.trigger === 'player') return ev.chain === 1;
    if (rule.trigger === 'cascade') return ev.chain >= 2;
    return false;
  }

  function checkRule(rule, ev, S) {
    for (const key of [rule.c1, rule.c2]) {
      if (!key) continue;
      const fail = condFails(key, ev, S);
      if (fail) return { pass: false, text: fail };
    }
    return { pass: true, text: `触发 → ${ACTIONS[rule.action].label}` };
  }

  // 严格从上到下；第一条命中即止。trace 只包含「触发器匹配」的规则，
  // 所以日志里不会出现「连消规则在玩家消除时被跳过」这种噪音。
  function evalRules(program, ev, S) {
    const trace = [];
    for (let i = 0; i < MAX_RULES; i++) {
      const rule = program && program[i];
      if (!ruleApplies(rule, ev)) continue;
      const res = checkRule(rule, ev, S);
      trace.push({ idx: i, pass: res.pass, text: res.text, rule });
      if (res.pass) return { fired: i, trace };
    }
    return { fired: -1, trace };
  }

  // ============================================================
  // 特殊棋子 / 爆炸
  // ============================================================
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

  function specialLabel(S, cell) {
    const t = S.board[cell];
    if (!t || !t.special) return '';
    if (t.special === 'rocketH') return '火箭 · 横扫整行';
    if (t.special === 'rocketV') return '火箭 · 竖穿整列';
    if (t.special === 'bomb') return '炸弹 · 周围九格';
    const k = rainbowTarget(S);
    return k == null ? '彩虹球 · 全场清空' : `彩虹球 · 消除全部${COLOR_NAMES[k]}色`;
  }

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

  // ============================================================
  // 重力 / 补充（与基础款一致：新棋子不能立刻凑三连）
  // ============================================================
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

  // ============================================================
  // 可行性 / 提示 / 洗牌
  // ============================================================
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

  function shuffle(S) {
    const normal = [];
    for (let i = 0; i < W * H; i++) {
      const t = S.board[i];
      if (t && !t.special) normal.push(i);
    }
    if (normal.length < 4) return false;
    const original = normal.map((i) => S.board[i].color);
    const colors = original.slice();
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
    // 失败也要还原：不能把「无匹配」的棋盘留成「有匹配」
    normal.forEach((cell, k) => { S.board[cell].color = original[k]; });
    return false;
  }

  function settle(S, steps) {
    if (hasAnyMove(S)) return false;
    const ok = shuffle(S);
    if (ok) {
      steps.push({
        t: 'shuffle',
        text: '没有可走的步了，重新排列',
        assign: S.board.map((t, i) => (t ? { id: t.id, color: t.color, special: t.special, origin: t.origin, cell: i } : null)).filter(Boolean),
      });
    }
    return ok;
  }

  // ============================================================
  // 结算
  // ============================================================
  function clearTiles(S, cells) {
    for (const c of cells) {
      const t = S.board[c];
      if (!t) continue;
      if (t.color != null) S.collected[t.color]++;
      S.board[c] = null;
    }
  }

  function breakIce(S, cells, steps) {
    const icy = [];
    for (const c of cells) {
      if (S.ice[c] > 0) { S.ice[c] = 0; icy.push(c); }
    }
    if (icy.length) steps.push({ t: 'ice', cells: icy });
    return icy;
  }

  function scoreCells(S, cleared, chain, steps) {
    let pts = 0;
    const cellsInfo = [];
    for (const c of cleared) {
      const t = S.board[c];
      if (!t) continue;
      pts += 10 * chain;
      if (t.special) pts += 10 * chain;
      cellsInfo.push({ i: c, id: t.id, color: t.color, special: t.special, origin: t.origin });
    }
    S.score += pts;
    steps.push({ t: 'clear', chain, points: pts, cells: cellsInfo });
    return cellsInfo;
  }

  function describeGroup(g) {
    const shape = g.shape === 'corner' ? '折角' : (g.hasH ? '横向' : '纵向');
    return `${COLOR_NAMES[g.color]}色 ${g.maxLen} 连 · ${shape}`;
  }

  function randomNormalCell(S, exclude) {
    const pool = [];
    for (let i = 0; i < W * H; i++) {
      const t = S.board[i];
      if (t && !t.special && (!exclude || !exclude.has(i))) pool.push(i);
    }
    if (!pool.length) return -1;
    return pool[(S.rng() * pool.length) | 0];
  }

  function spawnSpecial(S, cell, special, ruleIdx, steps, chain) {
    const t = S.board[cell];
    if (!t) return;
    t.special = special;
    t.origin = ruleIdx;
    if (special === 'rainbow') t.color = null;
    S.specialsMade++;
    S.score += SPAWN_SCORE;
    steps.push({ t: 'spawn', cell, id: t.id, special, color: t.color, origin: ruleIdx, chain });
  }

  function applyTurnAction(S, rule, ruleIdx, steps, exclude) {
    const act = ACTIONS[rule.action];
    if (!act) return;
    if (act.type === 'bonus') {
      S.score += BONUS_AMT;
      steps.push({ t: 'bonus', amount: BONUS_AMT, idx: ruleIdx });
      return;
    }
    const cell = randomNormalCell(S, exclude);
    if (cell < 0) return;
    const sp = act.type === 'rocket' ? 'rocketH' : act.type === 'randbomb' ? 'bomb' : act.type;
    spawnSpecial(S, cell, sp, ruleIdx, steps, 1);
  }

  // 「每步开始」对三种有效操作都成立：普通交换、点道具、道具组合。
  function runTurnRules(S, steps, exclude) {
    if (!S.program) return;
    const ev = { kind: 'turn', chain: 0, maxRun: 0, shape: 'line', hasH: false, hasV: false, color: -1 };
    const res = evalRules(S.program, ev, S);
    for (const tr of res.trace) {
      steps.push({
        t: tr.pass ? 'ruleFire' : 'ruleSkip', idx: tr.idx, text: tr.text, chain: 0,
        action: tr.pass && S.program[tr.idx] ? S.program[tr.idx].action : undefined,
      });
    }
    if (res.fired >= 0) {
      S.rulesFired++;
      applyTurnAction(S, S.program[res.fired], res.fired, steps, exclude || new Set());
    }
  }

  function actionSpecial(act, group) {
    if (act.type === 'rocket') return (group.hasV && !group.hasH) ? 'rocketV' : 'rocketH';
    if (act.type === 'randbomb') return 'bomb';
    return act.type;
  }

  function chainLoop(S, steps, prefer) {
    let chain = 0;
    let pending = prefer || [];
    for (;;) {
      const groups = findMatches(S.board);
      if (!groups.length) break;
      chain++;
      S.maxChain = Math.max(S.maxChain, chain);

      steps.push({
        t: 'match', chain,
        groups: groups.map((g, gi) => ({
          cells: g.cells, color: g.color, shape: g.shape, len: g.maxLen, dir: g.dir,
          gi, desc: describeGroup(g),
        })),
      });

      const protect = new Set();

      for (let gi = 0; gi < groups.length; gi++) {
        const g = groups[gi];
        const ev = {
          kind: 'match', chain,
          maxRun: g.maxLen, shape: g.shape, hasH: g.hasH, hasV: g.hasV, color: g.color,
        };
        const res = evalRules(S.program, ev, S);
        for (const tr of res.trace) {
          steps.push({
            t: tr.pass ? 'ruleFire' : 'ruleSkip',
            idx: tr.idx, text: tr.text, chain,
            group: describeGroup(g), gi,
            action: tr.pass && S.program[tr.idx] ? S.program[tr.idx].action : undefined,
            at: tr.pass ? pickSpawn(g, pending) : undefined,
          });
        }
        if (res.fired >= 0) {
          const rule = S.program[res.fired];
          const act = ACTIONS[rule.action];
          S.rulesFired++;
          if (act.type === 'bonus') {
            S.score += BONUS_AMT;
            steps.push({ t: 'bonus', amount: BONUS_AMT, idx: res.fired, at: pickSpawn(g, pending) });
          } else if (act.type === 'randbomb') {
            const cell = randomNormalCell(S, new Set([...g.cells, ...protect]));
            if (cell >= 0) {
              spawnSpecial(S, cell, 'bomb', res.fired, steps, chain);
              protect.add(cell);
            }
          } else {
            const cell = pickSpawn(g, pending);
            const sp = actionSpecial(act, g);
            spawnSpecial(S, cell, sp, res.fired, steps, chain);
            protect.add(cell);
          }
        }
      }

      const seeds = [];
      for (const g of groups) for (const c of g.cells) if (!protect.has(c)) seeds.push(c);

      const cleared = expandBlasts(S, seeds, steps, protect);
      scoreCells(S, cleared, chain, steps);
      breakIce(S, cleared, steps);
      clearTiles(S, cleared);
      steps.push(...fallStep(S));
      pending = [];
    }
    return chain;
  }

  function burst(S, seeds, steps, label, chain) {
    steps.push({ t: 'combo', a: seeds[0], b: seeds[0], text: label });
    const cleared = expandBlasts(S, seeds, steps);
    scoreCells(S, cleared, chain, steps);
    breakIce(S, cleared, steps);
    clearTiles(S, cleared);
    steps.push(...fallStep(S));
    return cleared;
  }

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
      const center = s1 ? b : a;
      seeds = [center];
      label = specialLabel(S, center);
    }

    burst(S, seeds, steps, label, 1);
    chainLoop(S, steps, []);
    settle(S, steps);
    return { invalid: false, steps };
  }

  function resolveTap(S, cell) {
    const t = S.board[cell];
    if (!t || !t.special) return { invalid: true, none: true, steps: [] };
    const steps = [];
    S.moves--;
    runTurnRules(S, steps, new Set([cell]));
    burst(S, [cell], steps, specialLabel(S, cell), 1);
    chainLoop(S, steps, []);
    settle(S, steps);
    return { invalid: false, steps };
  }

  /**
   * 玩家交换相邻两枚（a、b 是格子下标）
   * - 任一方是道具 → 直接发动（含组合技），不需要凑三连
   * - 普通交换 → 无匹配就还原、不扣步
   * - 有效 → 扣 1 步 → 先跑「每步开始」规则 → 再进匹配/连消循环
   */
  function resolveMove(S, a, b) {
    const steps = [];
    const t1 = S.board[a], t2 = S.board[b];
    if (!t1 || !t2) return { invalid: true, steps };

    const swapRaw = () => { S.board[a] = t2; S.board[b] = t1; };

    if (isSpecialSwap(t1, t2)) {
      swapRaw();
      steps.push({ t: 'swap', a, b });
      S.moves--;
      runTurnRules(S, steps, new Set([a, b]));
      return comboMove(S, t1, t2, a, b, steps);
    }

    swapRaw();
    steps.push({ t: 'swap', a, b });
    const initialGroups = findMatches(S.board);
    if (!initialGroups.length) {
      S.board[a] = t1; S.board[b] = t2;
      steps.push({ t: 'revert', a, b });
      return { invalid: true, steps };
    }

    S.moves--;

    // 「每步开始」：一步成立之后、消除之前
    const exclude = new Set();
    for (const g of initialGroups) for (const c of g.cells) exclude.add(c);
    runTurnRules(S, steps, exclude);

    chainLoop(S, steps, [a, b]);
    settle(S, steps);
    return { invalid: false, steps };
  }

  // ============================================================
  // 目标 / 星级
  // ============================================================
  function iceLeft(S) {
    let n = 0;
    for (let i = 0; i < W * H; i++) if (S.ice[i] > 0) n++;
    return n;
  }

  function goalProgress(S) {
    const out = S.level.goals.map((g) => {
      if (g.score != null) return { kind: 'score', need: g.score, have: S.score, done: S.score >= g.score };
      return { kind: 'color', color: g.color, need: g.n, have: S.collected[g.color], done: S.collected[g.color] >= g.n };
    });
    if (S.level.ice) {
      const left = iceLeft(S);
      out.push({ kind: 'ice', need: S.iceTotal, have: S.iceTotal - left, left, done: left === 0 });
    }
    return out;
  }

  function isWin(S) { return S.level.goals.length > 0 && goalProgress(S).every((g) => g.done); }
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
    const parts = level.goals.map((g) => (g.score != null ? `${g.score} 分` : `${COLOR_NAMES[g.color]}色 ×${g.n}`));
    if (level.ice) {
      const n = iceCells(level.ice).length;
      parts.push(`砸开全部 ${n} 块冰`);
    }
    if (!parts.length) parts.push('自由练习');
    return parts.join(' · ');
  }

  // ============================================================
  // 克隆 / bot（调关卡数值 + 回归测试）
  // ============================================================
  function cloneGame(S) {
    return {
      level: S.level,
      board: S.board.map((t) => (t ? { id: t.id, color: t.color, special: t.special, origin: t.origin } : null)),
      seed: S.seed,
      ice: S.ice.slice(), iceTotal: S.iceTotal,
      moves: S.moves, movesTotal: S.movesTotal,
      score: S.score, collected: S.collected.slice(),
      maxChain: S.maxChain, specialsMade: S.specialsMade, rulesFired: S.rulesFired,
      rng: S.rng.clone(), program: cloneProgram(S.program),
    };
  }

  function botCandidates(S) {
    const out = [];
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const i = idx(r, c);
        if (S.board[i] && S.board[i].special) out.push({ tap: i });
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          if (!inB(r + dr, c + dc)) continue;
          const j = idx(r + dr, c + dc);
          if (!S.board[i] || !S.board[j]) continue;
          out.push({ a: i, b: j });
        }
      }
    }
    return out;
  }

  function outcomeScore(S, before) {
    let sc = 0;
    for (const g of S.level.goals) {
      if (g.score != null) continue;
      const gain = S.collected[g.color] - before.collected[g.color];
      const remain = Math.max(0, g.n - before.collected[g.color]);
      sc += gain * (remain > 0 ? 14 : 2);
    }
    if (S.level.ice) sc += (iceLeft(before) - iceLeft(S)) * (S.level.goals.length ? 22 : 8);
    if (S.level.goals.some((g) => g.score != null)) sc += (S.score - before.score) * 0.12;
    else sc += (S.score - before.score) * 0.02;
    sc += (S.maxChain - before.maxChain) * 4;
    sc += (S.rulesFired - before.rulesFired) * 2;
    return sc;
  }

  function botMove(S) {
    let best = null, bestScore = -Infinity;
    for (const cand of botCandidates(S)) {
      const sim = cloneGame(S);
      const res = cand.tap != null ? resolveTap(sim, cand.tap) : resolveMove(sim, cand.a, cand.b);
      if (res.invalid) continue;
      const sc = outcomeScore(sim, S);
      if (sc > bestScore) { bestScore = sc; best = cand; }
    }
    return best;
  }

  function simulateLevel(levelIdx, program, seed) {
    const level = levelFor(levelIdx);
    const S = createGame(level, seed, program);
    for (let step = 0; step < 160; step++) {
      if (isWin(S) || S.moves <= 0) break;
      const mv = botMove(S);
      if (!mv) { const steps = []; settle(S, steps); if (!hasAnyMove(S)) break; continue; }
      const res = mv.tap != null ? resolveTap(S, mv.tap) : resolveMove(S, mv.a, mv.b);
      if (res.invalid) break;
    }
    return {
      win: isWin(S), stars: starsFor(level, S), score: S.score,
      movesLeft: S.moves, iceLeft: iceLeft(S), maxChain: S.maxChain, level,
    };
  }

  // ============================================================
  // 导出
  // ============================================================
  const API = {
    W, H, N_COLORS, MAX_RULES, BONUS_AMT,
    COLORS, COLOR_NAMES, ELEMENTS, SPECIALS,
    TRIGGERS, CONDS, CONDS_FOR, ACTIONS, ACTIONS_FOR,
    EMPTY_RULE, emptyRule, makeRule, defaultProgram, normalizeProgram, cloneProgram,
    ruleCost, programCost, ruleText,
    LEVELS, RECIPES, levelFor,
    idx, inB, rowOf, colOf, newTile, makeRNG,
    createGame, findMatches, matchAt, pickSpawn, blastCells,
    evalRules, condFails,
    resolveMove, resolveTap, hasAnyMove, findHint, shuffle, settle,
    goalProgress, isWin, isLose, starsFor, goalText, iceLeft, iceCells,
    cloneGame, botMove, botCandidates, simulateLevel,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  global.M3P = API;
})(typeof window !== 'undefined' ? window : globalThis);
