// ===== 像素要塞 · 工具函数 =====

/** 两点距离 */
function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

/** 限制值在范围内 */
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/** 随机整数 [min, max] */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 随机浮点 [min, max) */
function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/** 从数组随机取一个元素 */
function randPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 线性插值 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** 格式化时间 */
function formatTime(seconds) {
  const s = Math.ceil(seconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`;
}

/** 深拷贝简单对象 */
function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/** Canvas 绘制圆角矩形 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
