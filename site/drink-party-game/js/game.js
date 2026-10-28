// game.js -- 多点触控、圆点跟随、抽签轮转动画
window.DPG = window.DPG || {};
DPG.game = (function () {
  'use strict';

  // 圆点颜色循环（不显示序号，仅靠颜色区分是谁）
  var COLORS = [
    '#ff5e7e', '#ffd23f', '#3ddc97', '#4dc4ff', '#b388ff',
    '#ff8a5b', '#5be3c2', '#ff76d6', '#7cffa0', '#ffe066'
  ];
  var colorIdx = 0;

  // phase 状态机：
  //   idle       -- 空闲，接受新触点（下注）/ 移动 / 抬起
  //   animating  -- 抽签轮转动画中，冻结所有触点（保持快照稳定）
  //   reveal     -- 中签揭晓：中奖圆点高亮单独保持，先不弹惩罚列表
  //   choosing   -- 惩罚列表已弹出，等待中签者挑选
  //   result     -- 已选定惩罚，展示结果
  var state = {
    dots: new Map(),      // touch.identifier -> { el, color, x, y }
    phase: 'idle',
    playArea: null
  };

  function init(playArea) {
    state.playArea = playArea;
    playArea.addEventListener('touchstart', onTouchStart, { passive: false });
    playArea.addEventListener('touchmove', onTouchMove, { passive: false });
    playArea.addEventListener('touchend', onTouchEnd, { passive: false });
    playArea.addEventListener('touchcancel', onTouchEnd, { passive: false });
  }

  // 震动反馈（渐进增强）：navigator.vibrate 在 Android Chrome 有效；
  // iOS Safari 不支持，调用会静默跳过，不影响任何功能。
  function buzz(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (e) { /* 静默 */ }
  }

  function positionDot(el, x, y) {
    el.style.setProperty('--x', x + 'px');
    el.style.setProperty('--y', y + 'px');
  }

  function addDot(touch) {
    var id = touch.identifier;
    if (state.dots.has(id)) return;
    var color = COLORS[colorIdx % COLORS.length];
    colorIdx++;

    var el = document.createElement('div');
    el.className = 'dot';
    el.style.setProperty('--color', color);   // 颜色走 CSS 变量，便于 winner 时叠金边
    var inner = document.createElement('div');
    inner.className = 'dot-inner';
    el.appendChild(inner);

    var x = touch.clientX, y = touch.clientY;
    positionDot(el, x, y);
    state.playArea.appendChild(el);
    state.dots.set(id, { el: el, color: color, x: x, y: y });
  }

  function onTouchStart(e) {
    e.preventDefault();                    // 阻止双击缩放等默认行为
    if (state.phase !== 'idle') return;    // 非空闲：不新增圆点
    for (var i = 0; i < e.changedTouches.length; i++) addDot(e.changedTouches[i]);
    if (e.changedTouches.length) buzz(15); // 按下时短促震动反馈
    updateCounter();
  }

  function onTouchMove(e) {
    e.preventDefault();                        // 阻止页面滚动
    if (state.phase !== 'idle') return;        // 非空闲：冻结圆点位置，画面稳定
    for (var i = 0; i < e.changedTouches.length; i++) {
      var touch = e.changedTouches[i];
      var d = state.dots.get(touch.identifier);
      if (d) { d.x = touch.clientX; d.y = touch.clientY; positionDot(d.el, d.x, d.y); }
    }
  }

  function onTouchEnd(e) {
    if (state.phase !== 'idle') return;        // 非空闲：圆点保持不动（含中奖者）
    for (var i = 0; i < e.changedTouches.length; i++) {
      var id = e.changedTouches[i].identifier;
      var d = state.dots.get(id);
      if (d) { d.el.remove(); state.dots.delete(id); }
    }
    updateCounter();
  }

  function updateCounter() {
    if (window.DPG && DPG.ui) DPG.ui.setCount(state.dots.size);
  }

  function getDots() { return Array.from(state.dots.values()); }
  function count() { return state.dots.size; }
  function getPhase() { return state.phase; }
  function setPhase(p) { state.phase = p; }

  // 抽签：高亮环在所有圆点间轮转，先快后慢，最终停在中签者
  function draw() {
    return new Promise(function (resolve) {
      var dots = getDots();
      if (dots.length < 2) { resolve(null); return; }
      state.phase = 'animating';   // 同步置位，外部随后调用 updateMainButton 能读到

      var winnerIdx = Math.floor(Math.random() * dots.length);
      var winner = dots[winnerIdx];

      var ring = document.createElement('div');
      ring.className = 'highlight-ring';
      state.playArea.appendChild(ring);

      var N = dots.length;
      var rounds = 2;                              // 完整转 2 圈
      var totalSteps = N * rounds + winnerIdx;     // 末步恰好落在中奖者
      var step = 0;

      function stepDelay(s) {                       // ease-out：先快 90ms 后慢 360ms
        var t = s / Math.max(1, totalSteps);
        return 90 + (360 - 90) * t * t;
      }

      function tick() {
        var target = dots[step % N];
        positionDot(ring, target.x, target.y);
        if (step >= totalSteps) {
          setTimeout(function () {
            ring.remove();
            winner.el.classList.add('winner');
            // 提到 #app 顶层（.dot.winner 的 z-index:30），确保不被结果横幅遮挡
            var app = document.getElementById('app');
            if (app) app.appendChild(winner.el);
            buzz([70, 50, 130]);                   // 中签揭晓：节奏震动
            resolve(winner);
          }, 280);                                  // 末步停顿一下再揭晓
          return;
        }
        step++;
        setTimeout(tick, stepDelay(step));
      }
      tick();
    });
  }

  // 重置一局：清除所有圆点与中奖高亮，回到 idle（下一局重新按住）
  function reset() {
    state.dots.forEach(function (d) { d.el.remove(); });
    state.dots.clear();
    var ring = state.playArea.querySelector('.highlight-ring');
    if (ring) ring.remove();
    state.phase = 'idle';
  }

  return {
    init: init, getDots: getDots, count: count,
    getPhase: getPhase, setPhase: setPhase,
    reset: reset, draw: draw, buzz: buzz
  };
})();
