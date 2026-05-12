// ===== 像素要塞 · 主入口 =====

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// ---- 游戏状态 ----
const Game = {
  // 核心状态
  state: 'idle',          // idle | prepping | playing | paused | over
  gold: START_GOLD,
  lives: START_LIVES,
  score: 0,
  wave: 0,

  // 实体
  towers: [],
  enemies: [],
  projectiles: [],
  particles: [],

  // 选中
  selectedTower: null,
  placingType: null,      // 正在放置的塔类型

  // 时间
  lastTime: 0,
  deltaTime: 0,
  prepTimer: 0,
  elapsedTime: 0,
};

// ---- 初始化 ----
function initGame() {
  Game.state = 'idle';
  Game.gold = START_GOLD;
  Game.lives = START_LIVES;
  Game.score = 0;
  Game.wave = 0;
  Game.towers = [];
  Game.enemies = [];
  Game.projectiles = [];
  Game.particles = [];
  Game.selectedTower = null;
  Game.placingType = null;
  Game.prepTimer = 0;
  Game.elapsedTime = 0;

  initMap();
  initUI();
}

// ---- 游戏主循环 ----
function gameLoop(timestamp) {
  if (Game.lastTime === 0) Game.lastTime = timestamp;
  Game.deltaTime = Math.min((timestamp - Game.lastTime) / 1000, 0.05); // cap delta
  Game.lastTime = timestamp;

  const dt = Game.deltaTime;
  Game.elapsedTime += dt;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

// ---- 更新逻辑 ----
function update(dt) {
  // 准备计时
  if (Game.state === 'prepping') {
    Game.prepTimer -= dt;
    if (Game.prepTimer <= 0) {
      startWave();
    }
  }

  // 更新敌人
  if (Game.state === 'playing') {
    for (const enemy of Game.enemies) {
      enemy.update(dt);
      // 燃烧 DoT
      if (enemy.burnTimer > 0) {
        enemy.burnTimer -= dt;
        enemy.takeDamage((enemy.burnDps || 0) * dt);
        if (enemy.dead) onEnemyKilled(enemy);
      }
    }
    // 处理到达终点 → 扣命
    for (const enemy of Game.enemies) {
      if (enemy.reachedEnd) {
        handleEnemyReachedEnd(enemy);
      }
    }
    Game.enemies = Game.enemies.filter(e => !e.dead && !e.reachedEnd);

    // 波次生成
    updateWaveSpawn(dt);
    // 持续检测波次是否结束
    checkWaveComplete();
  }

  // 更新塔
  for (const tower of Game.towers) {
    tower.update(dt);
  }

  // 更新弹道
  for (const proj of Game.projectiles) {
    proj.update(dt);
  }
  Game.projectiles = Game.projectiles.filter(p => !p.dead);

  // 更新粒子
  for (const p of Game.particles) {
    p.update(dt);
  }
  Game.particles = Game.particles.filter(p => !p.dead);

  // 检查游戏结束
  if (Game.lives <= 0 && Game.state !== 'over') {
    gameOver();
  }
}

// ---- 渲染 ----
function render() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawMap();
  drawBuildableHighlight();
  drawTowers();
  drawEnemies();
  drawProjectiles();
  drawParticles();
  drawRangePreview();

  // 准星
  if (Game.placingType) {
    const mx = Game.mouseGridX * CELL_SIZE + CELL_SIZE / 2;
    const my = Game.mouseGridY * CELL_SIZE + CELL_SIZE / 2;
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(
      Game.mouseGridX * CELL_SIZE + 2,
      Game.mouseGridY * CELL_SIZE + 2,
      CELL_SIZE - 4,
      CELL_SIZE - 4
    );
    ctx.setLineDash([]);
  }
}

// ---- 键盘 ----
window.addEventListener('keydown', (e) => {
  switch (e.key.toLowerCase()) {
    case '1': selectTowerType('arrow'); break;
    case '2': selectTowerType('cannon'); break;
    case '3': selectTowerType('ice'); break;
    case '4': selectTowerType('tesla'); break;
    case 'escape':
      Game.placingType = null;
      Game.selectedTower = null;
      updateUI();
      break;
    case ' ':
      e.preventDefault();
      if (Game.state === 'idle') startPrepPhase();
      break;
    case 's':
      if (Game.selectedTower) sellTower(Game.selectedTower);
      break;
    case 'u':
      if (Game.selectedTower) upgradeTower(Game.selectedTower);
      break;
  }
});

// ---- 鼠标 ----
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;
  Game.mouseX = mx;
  Game.mouseY = my;
  Game.mouseGridX = Math.floor(mx / CELL_SIZE);
  Game.mouseGridY = Math.floor(my / CELL_SIZE);
});

canvas.addEventListener('click', (e) => {
  const gx = Game.mouseGridX;
  const gy = Game.mouseGridY;

  // 如果正在放置塔
  if (Game.placingType) {
    placeTower(gx, gy, Game.placingType);
    return;
  }

  // 点击已有塔 → 选中
  const clicked = Game.towers.find(t => t.gridX === gx && t.gridY === gy);
  if (clicked) {
    selectTower(clicked);
    return;
  }

  // 点击空地 → 取消选择
  Game.selectedTower = null;
  Game.placingType = null;
  updateUI();
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  Game.placingType = null;
  Game.selectedTower = null;
  updateUI();
});

// ---- 启动 ----
initGame();
requestAnimationFrame(gameLoop);
