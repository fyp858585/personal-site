// ===== 像素要塞 · 渲染器 =====

const COLORS = {
  grass: '#1a2a1a',
  grassAlt: '#152515',
  path: '#3a3028',
  pathBorder: '#2a2018',
  buildable: '#1a3a1a',
  buildableHover: '#2a5a2a',
  buildableHighlight: 'rgba(0, 255, 136, 0.15)',
  gridLine: 'rgba(255,255,255,0.03)',
};

function drawMap() {
  for (let gy = 0; gy < GRID_ROWS; gy++) {
    for (let gx = 0; gx < GRID_COLS; gx++) {
      const x = gx * CELL_SIZE;
      const y = gy * CELL_SIZE;
      const tile = grid[gy][gx];

      // 底色
      if (tile === TILE.PATH) {
        ctx.fillStyle = ((gx + gy) % 2 === 0) ? '#3a3028' : '#352b23';
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        // 路径边框
        ctx.strokeStyle = '#2a2018';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      } else if (tile === TILE.BUILDABLE) {
        ctx.fillStyle = ((gx + gy) % 2 === 0) ? '#1a3a1a' : '#163616';
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      } else {
        ctx.fillStyle = ((gx + gy) % 2 === 0) ? '#121a12' : '#0f170f';
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      }

      // 网格线
      ctx.strokeStyle = 'rgba(255,255,255,0.02)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
    }
  }

  // 路径方向指示 (箭头)
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.font = '10px monospace';
  for (let i = 0; i < pathPoints.length - 1; i += 4) {
    const p = pathPoints[i];
    ctx.fillText('→', p.x - 4, p.y + 3);
  }

  // 入口/出口标记
  if (pathPoints.length > 0) {
    const entrance = pathPoints[0];
    const exit = pathPoints[pathPoints.length - 1];
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('入口', entrance.x - 16, entrance.y - 8);
    ctx.fillStyle = '#ff4466';
    ctx.fillText('出口', exit.x - 16, exit.y - 8);
  }
}

function drawBuildableHighlight() {
  if (!Game.placingType && !Game.selectedTower) return;

  // 放置模式：高亮所有可建造格
  if (Game.placingType && Game.mouseGridX >= 0 && Game.mouseGridY >= 0) {
    const gx = Game.mouseGridX;
    const gy = Game.mouseGridY;
    if (isBuildable(gx, gy) && !Game.towers.find(t => t.gridX === gx && t.gridY === gy)) {
      ctx.fillStyle = 'rgba(0, 229, 255, 0.2)';
      ctx.fillRect(gx * CELL_SIZE, gy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(gx * CELL_SIZE + 1, gy * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    }
  }

  // 选中塔：高亮范围
  if (Game.selectedTower) {
    const t = Game.selectedTower;
    const cx = t.gridX * CELL_SIZE + CELL_SIZE / 2;
    const cy = t.gridY * CELL_SIZE + CELL_SIZE / 2;
    const range = t.getRange() * CELL_SIZE;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.arc(cx, cy, range, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRangePreview() {
  if (!Game.placingType) return;
  const gx = Game.mouseGridX;
  const gy = Game.mouseGridY;
  if (!isBuildable(gx, gy)) return;
  if (Game.towers.find(t => t.gridX === gx && t.gridY === gy)) return;

  const cx = gx * CELL_SIZE + CELL_SIZE / 2;
  const cy = gy * CELL_SIZE + CELL_SIZE / 2;
  const range = TOWER_TYPES[Game.placingType].range * CELL_SIZE;

  ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(cx, cy, range, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawTowers() {
  for (const tower of Game.towers) {
    tower.draw(ctx);
  }
}

function drawEnemies() {
  for (const enemy of Game.enemies) {
    enemy.draw(ctx);
  }
}

function drawProjectiles() {
  for (const proj of Game.projectiles) {
    proj.draw(ctx);
  }
}

function drawParticles() {
  for (const p of Game.particles) {
    p.draw(ctx);
  }
}
