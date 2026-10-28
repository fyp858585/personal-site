/* 引擎回归测试：node test/engine.test.js
 * 每条断言对应 RULES.md 里的一条规则。
 *
 * 构造测试棋盘的原则：真实棋盘永远是「稳定」的（无三连），
 * 所以所有图形都必须由「一次交换」补上一个缺口形成。 */
'use strict';

const M3 = require('../js/engine.js');
const { W, H, idx } = M3;

let pass = 0, fail = 0;
const failures = [];
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; failures.push(name); console.log('  ✗ ' + name + (extra ? '  →  ' + extra : '')); }
}
function eq(actual, expected, name) {
  ok(actual === expected, name, `期望 ${expected}，实际 ${actual}`);
}
function group(name, fn) { console.log('\n' + name); fn(); }

// ---------- 测试工具 ----------
function quietBoard(seed) {
  return M3.createGame(M3.LEVELS[0], seed).board;
}
// 没被盖章的格子，凡是处在三连里的都改色，直到棋盘稳定
function fixNoise(board, protect) {
  for (let round = 0; round < 800; round++) {
    let dirty = false;
    for (let i = 0; i < W * H; i++) {
      if (protect.has(i)) continue;
      if (!M3.matchAt(board, i)) continue;
      dirty = true;
      const old = board[i].color;
      for (let c = 0; c < M3.N_COLORS; c++) {
        board[i].color = c;
        if (!M3.matchAt(board, i)) break;
        board[i].color = old;
      }
    }
    if (!dirty) return;
  }
  throw new Error('fixNoise 没收敛');
}
function stamp(cells, walls = [], seed = 2024) {
  const board = quietBoard(seed);
  const protect = new Set();
  for (const [i, color] of cells.concat(walls)) {
    board[i] = M3.newTile(color);
    protect.add(i);
  }
  fixNoise(board, protect);
  return board;
}
const cellName = (i) => `r${M3.rowOf(i)}c${M3.colOf(i)}`;
function mkState(board, level) {
  level = level || M3.LEVELS[0];
  return {
    level, board, moves: level.moves, movesTotal: level.moves,
    score: 0, collected: [0, 0, 0, 0, 0], maxChain: 0, specialsMade: 0,
    rng: M3.makeRNG(7), onEvent: null,
  };
}
const find = (steps, type) => steps.filter((s) => s.t === type);

// ============================================================
group('① 发牌', () => {
  const S = M3.createGame(M3.LEVELS[0], 1);
  eq(S.board.length, 64, '棋盘 8×8 = 64 格');
  ok(S.board.every((t) => t && t.color != null), '每格都有棋子');
  eq(M3.findMatches(S.board).length, 0, '开局没有现成三连');
  ok(M3.hasAnyMove(S), '开局至少有一步可走');
  ok(S.moves === M3.LEVELS[0].moves && S.score === 0, '步数与分数初始化正确');

  const A = M3.createGame(M3.LEVELS[0], 42);
  const B = M3.createGame(M3.LEVELS[0], 42);
  ok(A.board.every((t, i) => t.color === B.board[i].color), '同种子 = 同一盘棋');
});

group('② 匹配检测', () => {
  let board = stamp([[idx(4, 1), 0], [idx(4, 2), 0], [idx(4, 3), 0]]);
  let g = M3.findMatches(board);
  eq(g.length, 1, '横向三连被识别');
  eq(g[0].cells.length, 3, '三连 = 3 格');
  eq(g[0].shape, 'line', '直线形状');

  board = stamp([[idx(1, 5), 1], [idx(2, 5), 1], [idx(3, 5), 1]]);
  g = M3.findMatches(board);
  eq(g.length, 1, '纵向三连被识别');
  eq(g[0].dir, 'v', '方向为纵向');

  board = stamp([
    [idx(3, 2), 2], [idx(3, 3), 2], [idx(3, 4), 2],
    [idx(4, 3), 2], [idx(5, 3), 2],
  ]);
  g = M3.findMatches(board);
  eq(g.length, 1, 'T 形合并成一组（不是两组）');
  eq(g[0].cells.length, 5, 'T 形共 5 格');
  eq(g[0].shape, 'corner', '形状判定为折角');
  ok(g[0].hasH && g[0].hasV, '横竖两个方向都有');

  board = stamp([
    [idx(0, 0), 3], [idx(0, 1), 3], [idx(0, 2), 3],
    [idx(7, 5), 4], [idx(7, 6), 4], [idx(7, 7), 4],
  ]);
  eq(M3.findMatches(board).length, 2, '互不相连的三连算两组');
});

group('③ 特殊棋子的生成规则', () => {
  const g = (o) => Object.assign({ cells: [], runs: [{ dir: 'h', len: 3, cells: [] }], hasH: true, hasV: false, maxLen: 3, dir: 'h' }, o);
  eq(M3.specialFor(g({ maxLen: 3 })), null, '三连 → 不生成特殊棋子');
  eq(M3.specialFor(g({ maxLen: 4, dir: 'h' })), 'rocketH', '横向四连 → 横向火箭');
  eq(M3.specialFor(g({ maxLen: 4, dir: 'v', hasH: false, hasV: true })), 'rocketV', '纵向四连 → 纵向火箭');
  eq(M3.specialFor(g({ maxLen: 5 })), 'rainbow', '五连 → 彩虹鸟');
  eq(M3.specialFor(g({ maxLen: 3, hasH: true, hasV: true })), 'bomb', '折角（L/T）→ 炸弹');
  eq(M3.specialFor(g({ maxLen: 6 })), 'rainbow', '六连 → 也是彩虹鸟');
});

group('④ 无效交换：还原、不扣步数', () => {
  const board = quietBoard(99);
  const S = mkState(board);
  const before = board.map((t) => t.color);
  let pair = null;
  for (let r = 0; r < H && !pair; r++) {
    for (let c = 0; c < W - 1 && !pair; c++) {
      const a = idx(r, c), b = idx(r, c + 1);
      const t = board.slice();
      t[a] = board[b]; t[b] = board[a];
      if (!M3.matchAt(t, a) && !M3.matchAt(t, b)) pair = [a, b];
    }
  }
  const res = M3.resolveMove(S, pair[0], pair[1]);
  ok(res.invalid, '判定为无效交换');
  eq(find(res.steps, 'revert').length, 1, '产出 revert 步骤');
  ok(S.board.every((t, i) => t.color === before[i]), '棋盘还原');
  eq(S.moves, M3.LEVELS[0].moves, '不扣步数');
});

group('⑤ 三连：扣步数、消除、计分、收集', () => {
  // 第 4 行：A A 缺口 A? 不 —— 只放两连 + 缺口，靠下面同色补进来
  const A = 0, X = 3;
  const board = stamp([
    [idx(4, 1), A], [idx(4, 2), A], [idx(4, 3), X],
    [idx(5, 3), A],
  ], [[idx(4, 4), 2], [idx(4, 0), 2], [idx(3, 1), 2], [idx(3, 2), 4], [idx(3, 3), 2], [idx(6, 3), 4]]);
  eq(M3.findMatches(board).length, 0, '交换前棋盘是稳定的');

  const S = mkState(board);
  const res = M3.resolveMove(S, idx(4, 3), idx(5, 3));
  ok(!res.invalid, '交换有效');
  eq(S.moves, M3.LEVELS[0].moves - 1, '扣 1 步');
  const cleared = find(res.steps, 'clear')[0].cells.map((c) => c.i);
  ok(cleared.length === 3, '消掉 3 格（实际 ' + cleared.length + '）');
  ok(cleared.includes(idx(4, 1)) && cleared.includes(idx(4, 2)) && cleared.includes(idx(4, 3)), '这 3 格正是被凑齐的三连');
  ok(S.score > 0, '分数增加');
  ok(S.collected[A] >= 3, `收集数 ≥ 3（实际 ${S.collected[A]}）`);
});

group('⑥ 四连 → 横向火箭（在玩家动过的那一格生成）', () => {
  const A = 1;
  const board = stamp([
    [idx(4, 1), A], [idx(4, 2), A], [idx(4, 3), 3], [idx(4, 4), A],
    [idx(5, 3), A],
  ], [[idx(4, 0), 2], [idx(4, 5), 2], [idx(3, 1), 2], [idx(3, 2), 0], [idx(3, 3), 2], [idx(6, 3), 4], [idx(5, 2), 4], [idx(5, 4), 0]]);
  eq(M3.findMatches(board).length, 0, '交换前棋盘是稳定的');

  const S = mkState(board);
  const res = M3.resolveMove(S, idx(4, 3), idx(5, 3));
  ok(!res.invalid, '四连交换有效');
  const spawns = find(res.steps, 'spawn');
  eq(spawns.length, 1, '生成了 1 个特殊棋子');
  eq(spawns[0].special, 'rocketH', '横向四连 → 横向火箭');
  eq(spawns[0].cell, idx(4, 3), '落在玩家交换进去的那一格');
  const cleared = find(res.steps, 'clear')[0].cells.map((c) => c.i);
  eq(cleared.length, 3, '其余 3 格被消掉，火箭留下');
  ok(!cleared.includes(idx(4, 3)), '火箭自己不参与消除');
});

group('⑦ 五连 → 彩虹鸟，颜色变空、不参与三连', () => {
  const A = 2;
  const board = stamp([
    [idx(2, 1), A], [idx(2, 2), A], [idx(2, 3), 3], [idx(2, 4), A], [idx(2, 5), A],
    [idx(3, 3), A],
  ], [[idx(2, 0), 0], [idx(2, 6), 0], [idx(1, 1), 0], [idx(1, 2), 4], [idx(1, 3), 0],
      [idx(4, 3), 4], [idx(3, 2), 4], [idx(3, 4), 0]]);
  eq(M3.findMatches(board).length, 0, '交换前棋盘是稳定的');

  const S = mkState(board);
  const res = M3.resolveMove(S, idx(2, 3), idx(3, 3));
  ok(!res.invalid, '五连交换有效');
  const sp = find(res.steps, 'spawn')[0];
  eq(sp.special, 'rainbow', '五连 → 彩虹鸟');
  ok(sp.color == null, '彩虹鸟没有颜色');
  eq(S.board[idx(2, 3)].special, 'rainbow', '棋盘上留下彩虹鸟');
  eq(M3.findMatches(S.board).length, 0, '彩虹鸟不会参与普通三连');
});

group('⑧ 折角 → 炸弹', () => {
  const A = 3;
  // 行 4: A A 缺口，列 3: A 缺口 A，从右边补进缺口 → 十字 5 格
  const board = stamp([
    [idx(4, 1), A], [idx(4, 2), A], [idx(4, 3), 0], [idx(4, 4), A],
    [idx(3, 3), A], [idx(5, 3), A],
  ], [[idx(4, 0), 1], [idx(4, 5), 1], [idx(2, 3), 1], [idx(6, 3), 1],
      [idx(3, 2), 1], [idx(3, 4), 2], [idx(5, 2), 2], [idx(5, 4), 1]]);
  eq(M3.findMatches(board).length, 0, '交换前棋盘是稳定的');

  const S = mkState(board);
  const res = M3.resolveMove(S, idx(4, 3), idx(4, 4));
  ok(!res.invalid, '折角交换有效');
  const g = M3.findMatches({ ...S.board });
  const spawns = find(res.steps, 'spawn');
  eq(spawns.length, 1, '生成了 1 个特殊棋子');
  eq(spawns[0].special, 'bomb', '折角（十字 5 格）→ 炸弹');
  const cleared = find(res.steps, 'clear')[0].cells.length;
  eq(cleared, 4, '其余 4 格被消掉（5 格 - 炸弹本身）');
});

group('⑨ 彩虹鸟主动交换：清空指定颜色', () => {
  const board = quietBoard(5);
  const S = mkState(board);
  board[idx(4, 4)] = M3.newTile(null);
  board[idx(4, 4)].special = 'rainbow';
  board[idx(4, 5)] = M3.newTile(0);

  const reds = [];
  board.forEach((t, i) => { if (t && t.color === 0) reds.push(i); });
  ok(reds.length > 5, '棋盘上有足够多的红色（' + reds.length + '）');

  const res = M3.resolveMove(S, idx(4, 4), idx(4, 5));
  ok(!res.invalid, '彩虹鸟交换永远有效');
  const cleared = new Set(find(res.steps, 'clear')[0].cells.map((c) => c.i));
  ok(reds.every((i) => cleared.has(i)), '交换时全场红色都进了消除集合');
  ok(cleared.size >= reds.length, '清掉的格数 ≥ 场上的红色数');
});

group('⑩ 火箭被三连引爆：清一整行', () => {
  const board = quietBoard(11);
  const A = 1;
  // 列 4：A（上） A（下） 缺口 A（下下）；火箭在中间那格
  board[idx(3, 4)] = M3.newTile(A);
  board[idx(4, 4)] = M3.newTile(A); board[idx(4, 4)].special = 'rocketH';
  board[idx(5, 4)] = M3.newTile(3);
  board[idx(6, 4)] = M3.newTile(A);
  fixNoise(board, new Set([idx(3, 4), idx(4, 4), idx(5, 4), idx(6, 4)]));
  const S = mkState(board);
  eq(M3.findMatches(board).length, 0, '交换前棋盘是稳定的');

  const res = M3.resolveMove(S, idx(5, 4), idx(6, 4));
  ok(!res.invalid, '三连交换有效');
  const blasts = find(res.steps, 'blast');
  eq(blasts.length, 1, '火箭被引爆一次');
  eq(blasts[0].special, 'rocketH', '引爆的是横向火箭');
  eq(blasts[0].cells.filter((c) => M3.rowOf(c) === 4).length, 8, '横向火箭扫过整行 8 格');
});

group('⑪ 特殊棋子组合', () => {
  const mk = (s1, s2) => {
    const board = quietBoard(21);
    board[idx(4, 4)].special = s1;
    board[idx(4, 5)].special = s2;
    return mkState(board);
  };
  let S = mk('rocketH', 'rocketH');
  let res = M3.resolveMove(S, idx(4, 4), idx(4, 5));
  ok(!res.invalid, '双火箭交换有效');
  let cells = find(res.steps, 'clear')[0].cells.map((c) => c.i);
  ok(cells.filter((i) => M3.rowOf(i) === 4).length === 8, '火箭×火箭：清整行');
  ok(cells.filter((i) => M3.colOf(i) === 4).length === 8, '火箭×火箭：清整列');

  S = mk('bomb', 'bomb');
  res = M3.resolveMove(S, idx(4, 4), idx(4, 5));
  cells = find(res.steps, 'clear')[0].cells.map((c) => c.i);
  eq(cells.length, 25, '炸弹×炸弹：5×5 = 25 格');

  S = mk('rocketV', 'bomb');
  res = M3.resolveMove(S, idx(4, 4), idx(4, 5));
  cells = find(res.steps, 'clear')[0].cells.map((c) => c.i);
  const rows = new Set(cells.map((i) => M3.rowOf(i)));
  ok(rows.size >= 3, '火箭×炸弹：至少波及 3 行');
});

group('⑫ 重力与补充', () => {
  const board = quietBoard(31);
  const S = mkState(board);
  let mv = null;
  for (let i = 0; i < 64; i++) {
    const r = M3.rowOf(i), c = M3.colOf(i);
    if (c < 7) {
      const t = board.slice(); t[i] = board[i + 1]; t[i + 1] = board[i];
      if (M3.matchAt(t, i) || M3.matchAt(t, i + 1)) { mv = [i, i + 1]; break; }
    }
  }
  ok(!!mv, '找到一步可行棋');
  const res = M3.resolveMove(S, mv[0], mv[1]);
  ok(!res.invalid, '交换有效');
  ok(S.board.every((t) => t !== null), '消除后棋盘没有空洞');
  eq(S.board.length, 64, '棋盘仍是 64 格');
  ok(find(res.steps, 'fall').length >= 1, '有掉落步骤');
});

group('⑬ 死局洗牌', () => {
  // 棋盘格图案：(r%2)*2 + (c%2) → 相邻永远不同色，绝对无解
  const colors = new Array(64);
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) colors[idx(r, c)] = (r % 2) * 2 + (c % 2);
  const board = M3.boardFromColors(colors);
  const S = mkState(board);
  eq(M3.findMatches(board).length, 0, '构造的棋盘无三连');
  eq(M3.hasAnyMove(S), false, '构造的棋盘无可行步');
  const steps = [];
  const okShuffle = M3.settle(S, steps);
  ok(okShuffle, '洗牌成功');
  eq(find(steps, 'shuffle').length, 1, '产出 shuffle 步骤');
  ok(M3.hasAnyMove(S), '洗牌后有可行步');
  eq(M3.findMatches(S.board).length, 0, '洗牌后没有现成三连');
});

group('⑭ 目标与星级', () => {
  const S = mkState(quietBoard(41), { id: 1, name: 't', moves: 20, goals: [{ color: 0, n: 10 }] });
  ok(!M3.isWin(S), '初始未达成');
  S.collected[0] = 10;
  ok(M3.isWin(S), '收集满即达成');
  eq(M3.starsFor(S.level, S), 3, '步数几乎没动 → 3 星');
  S.collected[0] = 0;
  S.moves = 0;
  ok(M3.isLose(S), '步数用完且未达成 → 失败');
});

group('⑮ 关卡数值（两种玩家模型各 10 局）', () => {
  // 随手玩 = 每步随机挑一个合法走法（难度下界）；盯目标 = 只挑对目标有用的走法（难度上界）
  const rows = [];
  let totalFloor = 0, totalCeil = 0;
  for (let li = 0; li < M3.LEVELS.length; li++) {
    let wFloor = 0, wCeil = 0;
    for (let s = 1; s <= 10; s++) {
      if (M3.simulateCasual(li, 1000 + s * 37).win) wFloor++;
      if (M3.simulate(li, 1000 + s * 37).win) wCeil++;
    }
    totalFloor += wFloor; totalCeil += wCeil;
    rows.push({ 关: M3.LEVELS[li].id, 名称: M3.LEVELS[li].name, 步数: M3.LEVELS[li].moves,
                目标: M3.goalText(M3.LEVELS[li]), 随手玩: wFloor + '/10', 盯目标: wCeil + '/10' });
  }
  console.table(rows);
  ok(totalCeil >= 72, `盯目标总胜率 ${totalCeil}/80 ≥ 90%（8 关都能过）`);
  ok(rows[0].随手玩 !== '0/10', `第 1 关随手玩也有 ${rows[0].随手玩}（教学关不能劝退）`);
});

group('⑯ 道具当场发动：点一下 / 换一格都算数', () => {
  const withSpecial = (seed, cell, sp) => {
    const board = quietBoard(seed);
    board[cell].special = sp;
    return { board, S: mkState(board) };
  };
  // 只看第一步 clear（道具自己那一下），不含掉落后连消带出来的格子
  const clearCells = (res) => {
    const st = find(res.steps, 'clear')[0];
    return st ? st.cells.map((c) => c.i) : [];
  };

  // --- 点击 ---
  let { board, S } = withSpecial(51, idx(4, 4), 'rocketH');
  let res = M3.resolveTap(S, idx(4, 4));
  ok(!res.invalid, '点火箭 → 有效操作');
  eq(S.moves, S.level.moves - 1, '点道具消耗 1 步（不多扣）');
  let cells = clearCells(res);
  eq(cells.filter((i) => M3.rowOf(i) === 4).length, 8, '点横向火箭：整行 8 格全清');
  ok(cells.indexOf(idx(4, 4)) >= 0, '火箭自己也被消耗掉');
  ok(S.board[idx(4, 4)] && S.board[idx(4, 4)].special !== 'rocketH', '棋盘上不再留着这枚火箭');

  ({ board, S } = withSpecial(52, idx(2, 2), 'bomb'));
  res = M3.resolveTap(S, idx(2, 2));
  cells = clearCells(res);
  ok(cells.indexOf(idx(1, 1)) >= 0 && cells.indexOf(idx(3, 3)) >= 0, '点炸弹：周围九格都算进去');
  ok(cells.every((i) => Math.abs(M3.rowOf(i) - 2) <= 1 && Math.abs(M3.colOf(i) - 2) <= 1), '点炸弹：不波及其他格');

  ({ board, S } = withSpecial(53, idx(4, 4), 'rainbow'));
  const cnt = new Array(M3.N_COLORS).fill(0);
  board.forEach((t) => { if (t && t.color != null) cnt[t.color]++; });
  const top = cnt.indexOf(Math.max(...cnt));
  res = M3.resolveTap(S, idx(4, 4));
  const blast = find(res.steps, 'blast')[0];
  ok(cnt[top] > 0, `场上最多的颜色是第 ${top} 色（${cnt[top]} 个）`);
  ok(blast && blast.cells.length - 1 === cnt[top], '彩虹球清掉的就是那把最多的颜色');

  // 点普通棋子：不算操作
  const plain = mkState(quietBoard(54));
  const r0 = M3.resolveTap(plain, idx(4, 4));
  ok(r0.invalid && r0.none, '点普通棋子 → 不发动、不扣步');
  eq(plain.moves, plain.level.moves, '点普通棋子不消耗步数');

  // --- 交换 ---
  const swapCase = (cell, sp, to) => {
    const b = quietBoard(55);
    b[cell].special = sp;
    const st = mkState(b);
    return { S: st, res: M3.resolveMove(st, cell, to) };
  };
  let one = swapCase(idx(4, 4), 'rocketH', idx(4, 5));
  ok(!one.res.invalid, '火箭和普通棋子交换：不需要凑三连也算有效');
  eq(one.S.moves, one.S.level.moves - 1, '交换发动道具消耗 1 步');
  cells = clearCells(one.res);
  eq(cells.filter((i) => M3.rowOf(i) === 4).length, 8, '横火换到右格后仍然横扫整行');

  // 竖火箭换到右边：在「换过去的那一格」发动 —— 拖动方向就是瞄准
  one = swapCase(idx(4, 4), 'rocketV', idx(4, 5));
  cells = clearCells(one.res);
  eq(cells.filter((i) => M3.colOf(i) === 5).length, 8, '竖火换到第 5 列 → 穿第 5 列（瞄准生效）');

  // 彩虹球换到普通棋子上：清掉那枚棋子的颜色
  const rb = quietBoard(56);
  rb[idx(4, 4)] = M3.newTile(null);
  rb[idx(4, 4)].special = 'rainbow';
  rb[idx(4, 5)] = M3.newTile(2);
  const rbs = mkState(rb);
  const greens = [];
  rb.forEach((t, i) => { if (t && t.color === 2) greens.push(i); });
  const rbres = M3.resolveMove(rbs, idx(4, 4), idx(4, 5));
  cells = clearCells(rbres);
  ok(greens.every((i) => cells.indexOf(i) >= 0), '彩虹球 + 绿棋 → 全场绿色都清掉');

  // 有道具的棋盘永远不算死局
  const colors = new Array(64);
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) colors[idx(r, c)] = (r % 2) * 2 + (c % 2);
  const deadBoard = M3.boardFromColors(colors);
  ok(M3.hasAnyMove(mkState(deadBoard)) === false, '（对照组）无道具的棋盘可以是死局');
  deadBoard[10].special = 'bomb';
  ok(M3.hasAnyMove(mkState(deadBoard)) === true, '有道具就不是死局：点一下就能走');
  ok(!!M3.findHint(mkState(deadBoard)), '有道具时一定能给出提示');
});

// ============================================================
console.log(`\n${fail === 0 ? '✅' : '❌'}  ${pass} 通过 / ${fail} 失败`);
if (fail) { console.log('失败项：\n  - ' + failures.join('\n  - ')); process.exit(1); }
