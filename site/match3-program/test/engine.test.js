/* ============================================================
 * 编程三消 · 引擎测试
 *   node test/engine.test.js
 *
 * 只测引擎（不碰 DOM）：规则顺序 / 触发时机 / 条件 / 动作 /
 * 冰面 / 连消 / 回合规则 / 确定性 / 关卡配置。
 * ============================================================ */
'use strict';

const assert = require('node:assert/strict');
const E = require('../js/engine.js');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ok   ' + name);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    console.log('  FAIL ' + name);
    console.log('       ' + (err && err.message ? err.message.split('\n')[0] : err));
  }
}

const L1 = E.LEVELS[0];
const L2 = E.LEVELS[1];
const L3 = E.LEVELS[2];
const L4 = E.LEVELS[3];

function ev(over) {
  return Object.assign({
    kind: 'match', chain: 1, maxRun: 3, shape: 'line',
    hasH: true, hasV: false, color: 0,
  }, over || {});
}

console.log('\n编程三消 · 引擎测试\n');

// ------------------------------------------------------------
test('程序规范化：4 个槽位 + 非法项清空', () => {
  const p = E.normalizeProgram([
    { on: true, trigger: 'turn', c1: 'min5', c2: 'c0', action: 'rainbow' },
    { on: true, trigger: 'bogus', c1: 'x', c2: 'y', action: 'nope' },
    null,
    { on: true, trigger: 'player', c1: 'min4', c2: 'c0', action: 'rocket' },
  ]);
  assert.equal(p.length, 4);
  assert.equal(p[0].trigger, 'turn');
  assert.equal(p[0].on, false);
  assert.equal(p[0].c1, null);
  assert.equal(p[0].c2, null);
  assert.equal(p[0].action, null);
  assert.equal(p[1].trigger, 'player');
  assert.equal(p[1].on, false);
  assert.equal(p[1].c1, null);
  assert.equal(p[1].action, null);
  assert.equal(p[2].on, false);
  assert.equal(p[2].action, null);
  assert.equal(p[3].on, true);
  assert.equal(p[3].c1, 'min4');
  assert.equal(p[3].c2, 'c0');
  assert.equal(p[3].action, 'rocket');
});

test('程序规范化：空程序补满 4 条空规则', () => {
  for (const input of [[], null, undefined]) {
    const p = E.normalizeProgram(input);
    assert.equal(p.length, 4);
    assert.equal(p.every((r) => r.action === null && r.on === false), true);
  }
});

test('停用的规则保留条件/动作，但 on=false', () => {
  const p = E.normalizeProgram([{ on: false, trigger: 'player', c1: 'min4', action: 'rocket' }]);
  assert.equal(p[0].on, false);
  assert.equal(p[0].c1, 'min4');
  assert.equal(p[0].action, 'rocket');
});

test('cloneProgram 是深拷贝', () => {
  const p = E.defaultProgram();
  const q = E.cloneProgram(p);
  assert.notEqual(q, p);
  assert.notEqual(q[0], p[0]);
  q[0].c1 = 'min3';
  q[0].on = false;
  assert.equal(p[0].c1, 'min5');
  assert.equal(p[0].on, true);
});

// ------------------------------------------------------------
test('成本：默认程序 9 点，单条成本计算正确', () => {
  assert.deepEqual(E.defaultProgram().map(E.ruleCost), [4, 3, 2, 0]);
  assert.equal(E.programCost(E.defaultProgram()), 9);
  assert.equal(E.ruleCost(E.makeRule('cascade', 'casc2', null, 'bonus')), 5);
  assert.equal(E.ruleCost(E.makeRule('turn', null, null, 'bonus')), 3);
  assert.equal(E.ruleCost(E.makeRule('player', 'min3', 'c0', 'rainbow')), 5);
  assert.equal(E.ruleCost({ ...E.defaultProgram()[0], on: false }), 0);
});

// ------------------------------------------------------------
test('规则顺序：第一条命中即止', () => {
  const p = [
    E.makeRule('player', 'min5', null, 'rainbow'),
    E.makeRule('player', 'corner', null, 'bomb'),
    E.makeRule('player', 'min4', null, 'rocket'),
  ];
  const S = { moves: 10 };

  const r5 = E.evalRules(p, ev({ maxRun: 5, shape: 'line' }), S);
  assert.equal(r5.fired, 0);
  assert.equal(r5.trace.length, 1);

  const rc = E.evalRules(p, ev({ maxRun: 3, shape: 'corner', hasV: true }), S);
  assert.equal(rc.fired, 1);
  assert.deepEqual(rc.trace.map((t) => t.idx), [0, 1]);
  assert.equal(rc.trace[0].pass, false);
  assert.equal(rc.trace[1].pass, true);

  const r4 = E.evalRules(p, ev({ maxRun: 4, shape: 'line' }), S);
  assert.equal(r4.fired, 2);
  assert.deepEqual(r4.trace.map((t) => t.idx), [0, 1, 2]);
  assert.deepEqual(r4.trace.map((t) => t.pass), [false, false, true]);

  const r3 = E.evalRules(p, ev({ maxRun: 3, shape: 'line' }), S);
  assert.equal(r3.fired, -1);
  assert.deepEqual(r3.trace.map((t) => t.idx), [0, 1, 2]);
  assert.deepEqual(r3.trace.map((t) => t.pass), [false, false, false]);
});

test('空程序不会命中', () => {
  for (const p of [[], null, E.normalizeProgram([])]) {
    const r = E.evalRules(p, ev({}), { moves: 10 });
    assert.equal(r.fired, -1);
    assert.equal(r.trace.length, 0);
  }
});

test('触发时机：player / cascade / turn 各自只在自己时机被检查', () => {
  const p = [
    E.makeRule('turn', null, null, 'bonus'),
    E.makeRule('player', 'min3', null, 'rocket'),
    E.makeRule('cascade', 'casc2', null, 'bomb'),
  ];
  const S = { moves: 10 };

  const c1 = E.evalRules(p, ev({ chain: 1 }), S);
  assert.equal(c1.fired, 1);
  assert.deepEqual(c1.trace.map((t) => t.idx), [1]);

  const c2 = E.evalRules(p, ev({ chain: 2 }), S);
  assert.equal(c2.fired, 2);
  assert.deepEqual(c2.trace.map((t) => t.idx), [2]);

  const turn = E.evalRules(p, { kind: 'turn', chain: 0, maxRun: 0, shape: 'line', hasH: false, hasV: false, color: -1 }, S);
  assert.equal(turn.fired, 0);
  assert.deepEqual(turn.trace.map((t) => t.idx), [0]);
});

// ------------------------------------------------------------
test('条件：连数是「最长直线」，不是总格数', () => {
  assert.equal(E.condFails('min3', ev({ maxRun: 3 }), { moves: 10 }), null);
  assert.notEqual(E.condFails('min4', ev({ maxRun: 3 }), { moves: 10 }), null);
  assert.equal(E.condFails('min5', ev({ maxRun: 5 }), { moves: 10 }), null);
  // 折角总格数可以是 5，但最长直线只有 3
  assert.notEqual(E.condFails('min5', ev({ maxRun: 3, shape: 'corner' }), { moves: 10 }), null);
  assert.equal(E.condFails('corner', ev({ maxRun: 3, shape: 'corner' }), { moves: 10 }), null);
  assert.notEqual(E.condFails('corner', ev({ shape: 'line' }), { moves: 10 }), null);
});

test('条件：形状 / 方向 / 颜色 / 连消层数 / 剩余步数', () => {
  const S = { moves: 5 };
  assert.equal(E.condFails('line', ev({ shape: 'line' }), S), null);
  assert.notEqual(E.condFails('line', ev({ shape: 'corner' }), S), null);

  assert.equal(E.condFails('horiz', ev({ hasH: true, hasV: false }), S), null);
  assert.equal(E.condFails('vert', ev({ hasH: false, hasV: true }), S), null);
  assert.notEqual(E.condFails('horiz', ev({ hasH: true, hasV: true }), S), null);
  assert.notEqual(E.condFails('vert', ev({ hasH: true, hasV: true }), S), null);

  assert.equal(E.condFails('c0', ev({ color: 0 }), S), null);
  assert.notEqual(E.condFails('c0', ev({ color: 1 }), S), null);
  assert.equal(E.condFails('c4', ev({ color: 4 }), S), null);

  assert.equal(E.condFails('casc2', ev({ chain: 2 }), S), null);
  assert.notEqual(E.condFails('casc3', ev({ chain: 2 }), S), null);
  assert.equal(E.condFails('casc3', ev({ chain: 3 }), S), null);

  assert.equal(E.condFails('low5', ev({}), { moves: 5 }), null);
  assert.notEqual(E.condFails('low5', ev({}), { moves: 6 }), null);
  assert.equal(E.condFails('low8', ev({}), { moves: 8 }), null);
  assert.notEqual(E.condFails('low8', ev({}), { moves: 9 }), null);
});

// ------------------------------------------------------------
test('回合规则：普通交换先加 150，玩家规则仍会照常检查', () => {
  const prog = [
    E.makeRule('turn', null, null, 'bonus'),
    E.makeRule('player', 'min3', null, 'rocket'),
  ];
  const S = E.createGame(L1, 123, prog);
  const pair = E.findHint(S);
  assert.ok(pair, '应有可走的步');
  const res = E.resolveMove(S, pair[0], pair[1]);
  assert.equal(res.invalid, false);
  assert.equal(res.steps.filter((s) => s.t === 'ruleFire' && s.chain === 0 && s.idx === 0).length, 1);
  assert.equal(res.steps.filter((s) => s.t === 'bonus').length, 1);
  assert.ok(res.steps.some((s) => s.t === 'spawn' && s.origin === 1));
  assert.ok(S.score >= E.BONUS_AMT);
  assert.ok(S.rulesFired >= 2);
});

test('回合规则：剩余步数在扣步之后判断', () => {
  for (const [start, shouldFire] of [[6, true], [7, false]]) {
    const S = E.createGame(L1, 33, [E.makeRule('turn', 'low5', null, 'bonus')]);
    S.moves = start;
    const pair = E.findHint(S);
    const res = E.resolveMove(S, pair[0], pair[1]);
    assert.equal(res.invalid, false);
    const fired = res.steps.some((s) => s.t === 'ruleFire' && s.idx === 0);
    assert.equal(fired, shouldFire, `开始 ${start} 步时 low5 应为 ${shouldFire}`);
    assert.equal(res.steps.some((s) => s.t === 'bonus'), shouldFire);
  }
});

test('回合规则：点道具也会触发，并砸掉冰面', () => {
  const S = E.createGame(L3, 77, [E.makeRule('turn', null, null, 'bonus')]);
  S.board[27].special = 'bomb'; // 第 4 行第 4 列，冰面内
  assert.equal(E.iceLeft(S), 48);
  const moves = S.moves;
  const res = E.resolveTap(S, 27);
  assert.equal(res.invalid, false);
  assert.equal(S.moves, moves - 1);
  assert.ok(res.steps.some((s) => s.t === 'blast' && s.special === 'bomb'));
  assert.ok(res.steps.some((s) => s.t === 'ice' && s.cells.length >= 9));
  assert.ok(E.iceLeft(S) <= 39);
  assert.equal(res.steps.filter((s) => s.t === 'ruleFire' && s.idx === 0).length, 1);
  assert.equal(res.steps.filter((s) => s.t === 'bonus').length, 1);
});

test('回合规则：道具组合也会触发', () => {
  const S = E.createGame(L1, 88, [E.makeRule('turn', null, null, 'bonus')]);
  S.board[27].special = 'bomb';
  S.board[28].special = 'bomb';
  const moves = S.moves;
  const res = E.resolveMove(S, 27, 28);
  assert.equal(res.invalid, false);
  assert.equal(S.moves, moves - 1);
  assert.ok(res.steps.some((s) => s.t === 'combo'));
  assert.equal(res.steps.filter((s) => s.t === 'ruleFire' && s.idx === 0).length, 1);
  assert.equal(res.steps.filter((s) => s.t === 'bonus').length, 1);
});

test('无效点击普通棋子不扣步、不触发回合规则', () => {
  const S = E.createGame(L1, 17, [E.makeRule('turn', null, null, 'bonus')]);
  const moves = S.moves;
  const score = S.score;
  const res = E.resolveTap(S, 0);
  assert.equal(res.invalid, true);
  assert.equal(S.moves, moves);
  assert.equal(S.score, score);
});

// ------------------------------------------------------------
test('动作：火箭 / 炸弹 / 彩虹 / 加分 / 随机炸弹', () => {
  const acts = ['rocket', 'bomb', 'rainbow', 'bonus', 'randbomb'];
  acts.forEach((act, i) => {
    const S = E.createGame(L1, 200 + i, [E.makeRule('player', 'min3', null, act)]);
    const pair = E.findHint(S);
    const res = E.resolveMove(S, pair[0], pair[1]);
    assert.equal(res.invalid, false, act + ' 的测试步应有效');
    const fire = res.steps.find((s) => s.t === 'ruleFire' && s.idx === 0);
    assert.ok(fire, act + ' 应触发规则 ①');
    assert.equal(fire.action, act);

    if (act === 'bonus') {
      assert.ok(res.steps.some((s) => s.t === 'bonus' && s.amount === E.BONUS_AMT));
      return;
    }
    const sp = res.steps.find((s) => s.t === 'spawn' && s.origin === 0);
    assert.ok(sp, act + ' 应生成道具');
    if (act === 'rocket') assert.ok(sp.special === 'rocketH' || sp.special === 'rocketV');
    else if (act === 'bomb') assert.equal(sp.special, 'bomb');
    else if (act === 'rainbow') {
      assert.equal(sp.special, 'rainbow');
      assert.equal(sp.color, null);
    } else if (act === 'randbomb') assert.equal(sp.special, 'bomb');
  });
});

test('随机炸弹不会落在触发它的那一组消除格上', () => {
  const S = E.createGame(L1, 204, [E.makeRule('player', 'min3', null, 'randbomb')]);
  const pair = E.findHint(S);
  const res = E.resolveMove(S, pair[0], pair[1]);
  assert.equal(res.invalid, false);
  const fire = res.steps.find((s) => s.t === 'ruleFire' && s.idx === 0 && s.action === 'randbomb');
  assert.ok(fire);
  const at = res.steps.indexOf(fire);
  const sp = res.steps.slice(at + 1).find((s) => s.t === 'spawn' && s.origin === 0);
  assert.ok(sp);
  const match = res.steps.find((s) => s.t === 'match' && s.chain === fire.chain);
  assert.ok(match);
  const group = match.groups[fire.gi];
  assert.equal(group.cells.includes(sp.cell), false);
});

test('炸弹 / 火箭的爆炸范围', () => {
  const S = E.createGame(L1, 12, E.defaultProgram());
  S.board[27].special = 'bomb';
  assert.equal(E.blastCells(S, 27).length, 9);
  S.board[27].special = 'rocketH';
  assert.equal(E.blastCells(S, 27).length, 8);
  S.board[27].special = 'rocketV';
  assert.equal(E.blastCells(S, 27).length, 8);
});

// ------------------------------------------------------------
test('确定性：同种子 + 同程序 + 同一交换 → 同结果', () => {
  const prog = E.defaultProgram();
  const A = E.createGame(L1, 777, prog);
  const B = E.createGame(L1, 777, prog);
  const pa = E.findHint(A);
  const pb = E.findHint(B);
  assert.deepEqual(pa, pb);
  const ra = E.resolveMove(A, pa[0], pa[1]);
  const rb = E.resolveMove(B, pb[0], pb[1]);
  assert.equal(ra.invalid, false);
  assert.equal(rb.invalid, false);
  assert.equal(A.score, B.score);
  assert.equal(A.moves, B.moves);
  assert.equal(A.maxChain, B.maxChain);
  assert.deepEqual(A.collected, B.collected);
  const strip = (S) => S.board.map((t) => (t ? [t.color, t.special, t.origin] : null));
  assert.deepEqual(strip(A), strip(B));
});

test('同种子重开：棋盘颜色完全一致', () => {
  const a = E.createGame(L1, 4242, E.defaultProgram());
  const b = E.createGame(L1, 4242, E.defaultProgram());
  assert.deepEqual(a.board.map((t) => t.color), b.board.map((t) => t.color));
  assert.equal(a.seed, b.seed);
});

// ------------------------------------------------------------
test('目标 / 过关 / 星级 / 关卡配置', () => {
  assert.equal(L2.moves, 18);
  assert.equal(L2.goals[0].score, 4500);
  assert.equal(L3.moves, 20);
  assert.equal(L4.sandbox, true);
  assert.equal(E.iceCells(L3.ice).length, 48);

  const S = E.createGame(L1, 5, E.defaultProgram());
  assert.equal(E.isWin(S), false);
  assert.equal(E.isLose(S), false);
  const gs = E.goalProgress(S);
  assert.equal(gs.length, 2);
  assert.equal(gs[0].kind, 'color');
  assert.equal(gs[0].need, 16);
  assert.equal(gs[0].have, 0);
  S.collected[0] = 16;
  S.collected[1] = 16;
  assert.equal(E.isWin(S), true);
  assert.equal(E.starsFor(L1, S), 3);

  const S3 = E.createGame(L3, 5, E.defaultProgram());
  assert.equal(E.iceLeft(S3), 48);
  const iceGoal = E.goalProgress(S3).find((g) => g.kind === 'ice');
  assert.equal(iceGoal.need, 48);
  assert.equal(iceGoal.left, 48);
  S3.collected[3] = 14;
  S3.ice.fill(0);
  assert.equal(E.isWin(S3), true);
  assert.equal(E.starsFor(L3, S3), 3);

  const S2 = E.createGame(L2, 5, E.defaultProgram());
  S2.score = 4500;
  assert.equal(E.starsFor(L2, S2), 1);
  S2.score = 5625;
  assert.equal(E.starsFor(L2, S2), 2);
  S2.score = 7200;
  assert.equal(E.starsFor(L2, S2), 3);

  assert.ok(E.goalText(L1).includes('红色 ×16'));
  assert.ok(E.goalText(L1).includes('黄色 ×16'));
  assert.ok(E.goalText(L3).includes('48'));
  assert.equal(E.goalText(L4), '自由练习');
});

test('沙盒没有目标，不会判胜', () => {
  const S = E.createGame(L4, 9, E.defaultProgram());
  assert.equal(E.goalProgress(S).length, 0);
  assert.equal(E.isWin(S), false);
  S.moves = 0;
  assert.equal(E.isLose(S), true); // 引擎层仍会判负；UI 对沙盒跳过结算
});

// ------------------------------------------------------------
test('洗牌：失败时还原，不留下假匹配', () => {
  const S = E.createGame(L1, 321, E.defaultProgram());
  const before = S.board.map((t) => t.color);
  const did = E.shuffle(S);
  assert.equal(E.findMatches(S.board).length, 0);
  if (did) {
    assert.equal(E.hasAnyMove(S), true);
  } else {
    assert.deepEqual(S.board.map((t) => t.color), before);
  }
});

test('洗牌：成功时无匹配且有步可走', () => {
  const S = E.createGame(L1, 1, E.defaultProgram());
  const did = E.shuffle(S);
  assert.equal(did, true);
  assert.equal(E.findMatches(S.board).length, 0);
  assert.equal(E.hasAnyMove(S), true);
});

test('提示：初始棋盘无匹配、有步可走', () => {
  for (const seed of [1, 2, 3, 77, 321, 4242]) {
    const S = E.createGame(L1, seed, E.defaultProgram());
    assert.equal(E.findMatches(S.board).length, 0);
    assert.equal(E.hasAnyMove(S), true);
    const pair = E.findHint(S);
    assert.ok(pair);
    const d = Math.abs(pair[0] - pair[1]);
    assert.ok(d === 1 || d === E.W, '提示应是一对相邻格');
  }
});

test('cloneGame：棋盘与程序都深拷贝', () => {
  const S = E.createGame(L1, 31, E.defaultProgram());
  const C = E.cloneGame(S);
  assert.notEqual(C, S);
  assert.deepEqual(C.board.map((t) => [t.color, t.special, t.origin]), S.board.map((t) => [t.color, t.special, t.origin]));
  assert.notEqual(C.program, S.program);
  assert.notEqual(C.program[0], S.program[0]);
  C.program[0].on = false;
  C.board[0].color = 99;
  assert.equal(S.program[0].on, true);
  assert.notEqual(S.board[0].color, 99);
});

// ------------------------------------------------------------
test('机器人：L1 出厂程序能过；L3 冰面配方能过', () => {
  const l1 = E.simulateLevel(0, E.defaultProgram(), 123);
  assert.equal(l1.win, true);
  assert.ok(l1.stars >= 1);

  const l3 = E.simulateLevel(2, E.RECIPES.ice, 424242);
  assert.equal(l3.win, true);
  assert.equal(l3.iceLeft, 0);
});

// ------------------------------------------------------------
console.log('\n' + (failed ? 'FAILED' : 'PASS') + '  ' + passed + ' passed, ' + failed + ' failed\n');
if (failed) {
  for (const f of failures) {
    console.log('\n--- ' + f.name + ' ---');
    console.log(f.err && f.err.stack ? f.err.stack : f.err);
  }
  process.exit(1);
}
