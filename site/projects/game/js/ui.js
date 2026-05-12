// ===== 像素要塞 · UI 管理 =====

let uiInitialized = false;

function initUI() {
  if (uiInitialized) return;
  uiInitialized = true;

  // 塔选择按钮
  document.querySelectorAll('.tower-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.tower;
      selectTowerType(type);
    });
  });

  // 出售按钮
  document.getElementById('btn-sell').addEventListener('click', () => {
    if (Game.selectedTower) {
      sellTower(Game.selectedTower);
    }
  });

  // 升级按钮
  document.getElementById('btn-upgrade').addEventListener('click', () => {
    if (Game.selectedTower && Game.selectedTower.canUpgrade()) {
      upgradeTower(Game.selectedTower);
    }
  });

  // 开始波次按钮
  document.getElementById('btn-start-wave').addEventListener('click', () => {
    if (Game.state === 'idle') {
      startPrepPhase();
    }
  });

  // 重新开始
  document.getElementById('btn-restart').addEventListener('click', () => {
    document.getElementById('game-over').classList.add('hidden');
    initGame();
    updateUI();
  });

  updateUI();
}

/** 刷新所有 UI */
function updateUI() {
  // HUD
  document.getElementById('wave-num').textContent = Game.wave;
  document.getElementById('lives').textContent = Game.lives;
  document.getElementById('gold').textContent = Game.gold;
  document.getElementById('score').textContent = Game.score;

  // 塔按钮状态 (钱不够变灰)
  document.querySelectorAll('.tower-btn').forEach(btn => {
    const cost = parseInt(btn.dataset.cost);
    if (Game.gold < cost) {
      btn.classList.add('disabled');
    } else {
      btn.classList.remove('disabled');
    }
  });

  // 选中状态
  document.querySelectorAll('.tower-btn').forEach(btn => {
    btn.classList.remove('selected');
    if (Game.placingType === btn.dataset.tower) {
      btn.classList.add('selected');
    }
  });

  // 出售/升级按钮
  const sellBtn = document.getElementById('btn-sell');
  const upgradeBtn = document.getElementById('btn-upgrade');

  if (Game.selectedTower) {
    sellBtn.classList.remove('hidden');
    sellBtn.innerHTML = `<span>🗑️</span> 出售 (${Game.selectedTower.getSellValue()}💰)`;

    if (Game.selectedTower.canUpgrade()) {
      upgradeBtn.classList.remove('hidden');
      upgradeBtn.innerHTML = `<span>⬆️</span> 升级 (${Game.selectedTower.getUpgradeCost()}💰)`;
    } else {
      upgradeBtn.classList.add('hidden');
    }

    // 塔信息面板
    showTowerInfo(Game.selectedTower);
  } else {
    sellBtn.classList.add('hidden');
    upgradeBtn.classList.add('hidden');
    hideTowerInfo();
  }

  // 开始按钮 — 空闲时显示，准备/游戏中隐藏
  if (Game.state === 'idle') {
    document.getElementById('btn-start-wave').classList.remove('hidden');
    document.getElementById('btn-start-wave').innerHTML =
      Game.wave === 0 ? '<span>▶️</span> 开始游戏' : '<span>▶️</span> 下一波';
  } else {
    document.getElementById('btn-start-wave').classList.add('hidden');
  }
}

/** 显示波次覆盖层 */
function showWaveOverlay(text) {
  const overlay = document.getElementById('wave-overlay');
  const textEl = document.getElementById('wave-overlay-text');
  textEl.innerHTML = text.replace(/\n/g, '<br>');
  overlay.classList.remove('hidden');

  // 重新触发动画
  textEl.style.animation = 'none';
  textEl.offsetHeight; // reflow
  textEl.style.animation = 'wavePulse 0.6s ease-out';

  setTimeout(() => {
    overlay.classList.add('hidden');
  }, 2000);
}

/** 显示塔信息 */
function showTowerInfo(tower) {
  const panel = document.getElementById('tower-info');
  const nameEl = document.getElementById('tower-info-name');
  const statsEl = document.getElementById('tower-info-stats');

  nameEl.textContent = tower.getName();
  statsEl.innerHTML = `
    伤害: ${Math.round(tower.getDamage())} | 范围: ${tower.getRange().toFixed(1)}格<br>
    攻速: ${tower.getFireRate().toFixed(1)}s | 等级: ${tower.level}/3<br>
    总投入: ${tower.totalSpent}💰 | 出售: ${tower.getSellValue()}💰
  `;

  // 定位到塔附近
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  panel.style.left = (rect.left + tower.x / scaleX + 40) + 'px';
  panel.style.top = (rect.top + tower.y / scaleY - 40) + 'px';
  panel.classList.remove('hidden');
}

function hideTowerInfo() {
  document.getElementById('tower-info').classList.add('hidden');
}

/** 游戏结束 */
function gameOver() {
  Game.state = 'over';
  const statsEl = document.getElementById('game-over-stats');
  statsEl.innerHTML = `
    到达波次: <span style="color:#00e5ff">第 ${Game.wave} 波</span><br>
    最终分数: <span style="color:#ffd740">${Game.score}</span><br>
    建造塔数: <span style="color:#a855f7">${Game.towers.length}</span><br>
    击杀数: <span style="color:#ff8c42">计算中...</span>
  `;
  document.getElementById('game-over').classList.remove('hidden');
}
