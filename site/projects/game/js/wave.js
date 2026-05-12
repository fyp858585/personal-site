// ===== 像素要塞 · 波次系统 =====

let waveSpawnQueue = [];   // 待生成的敌人 [{typeKey, delay}]
let waveSpawnTimer = 0;
let waveEnemiesRemaining = 0;
let waveActive = false;

/** 开始准备阶段 */
function startPrepPhase() {
  if (Game.state !== 'idle') return;
  Game.state = 'prepping';
  Game.wave++;
  Game.prepTimer = WAVE_PREP_TIME;
  document.getElementById('btn-start-wave').classList.add('hidden');
  showWaveOverlay(`第 ${Game.wave} 波\n准备中...`);
  updateUI();
}

/** 正式开始出怪 */
function startWave() {
  Game.state = 'playing';
  waveActive = true;
  generateWave(Game.wave);
  waveSpawnTimer = 0;
  showWaveOverlay(`⚔️ 第 ${Game.wave} 波`);
  updateUI();
}

/** 检查波次是否结束 */
function checkWaveComplete() {
  if (!waveActive) return;
  if (waveSpawnQueue.length === 0 && Game.enemies.length === 0) {
    endWave();
  }
}

/** 波次结束 */
function endWave() {
  waveActive = false;
  const bonus = WAVE_BONUS_BASE + Game.wave * WAVE_BONUS_PER;
  Game.gold += bonus;
  Game.state = 'idle';
  document.getElementById('btn-start-wave').classList.remove('hidden');
  showWaveOverlay(`✅ 第 ${Game.wave} 波 通关!\n+${bonus}💰`);
  updateUI();
}

/** 生成波次敌人队列 */
function generateWave(waveNum) {
  waveSpawnQueue = [];

  const isBossWave = waveNum % BOSS_WAVE_INTERVAL === 0;
  const isRushWave = waveNum % RUSH_WAVE_INTERVAL === 0;
  const isSiegeWave = waveNum % SIEGE_WAVE_INTERVAL === 0;

  if (isBossWave) {
    // Boss 波: 1 Boss + 随从
    waveSpawnQueue.push({ typeKey: 'boss', delay: 0.5 });
    const escortCount = 4 + Math.floor(waveNum / 5);
    for (let i = 0; i < escortCount; i++) {
      waveSpawnQueue.push({
        typeKey: randPick(['grunt', 'runner']),
        delay: randFloat(0.1, 0.6),
      });
    }
  } else if (isRushWave) {
    // 闪电冲锋波: 全是疾行者
    const count = BASE_ENEMY_COUNT + waveNum * ENEMIES_PER_WAVE + 5;
    for (let i = 0; i < count; i++) {
      waveSpawnQueue.push({
        typeKey: 'runner',
        delay: randFloat(0.05, 0.2),
      });
    }
  } else if (isSiegeWave) {
    // 铁壁重装波: 全是重装兵
    const count = BASE_ENEMY_COUNT + waveNum * ENEMIES_PER_WAVE * 0.6;
    for (let i = 0; i < count; i++) {
      waveSpawnQueue.push({
        typeKey: 'tank',
        delay: randFloat(0.2, 0.5),
      });
    }
  } else {
    // 普通波: 混合敌人
    const total = Math.floor(BASE_ENEMY_COUNT + waveNum * ENEMIES_PER_WAVE);
    const availableTypes = [];
    for (const [key, cfg] of Object.entries(ENEMY_TYPES)) {
      if (cfg.minWave <= waveNum && !cfg.boss) {
        availableTypes.push(key);
      }
    }

    for (let i = 0; i < total; i++) {
      const typeKey = weightedPick(availableTypes, waveNum);
      waveSpawnQueue.push({
        typeKey,
        delay: randFloat(0.1, SPAWN_INTERVAL_MAX - waveNum * 0.05),
      });
    }
  }

  waveEnemiesRemaining = waveSpawnQueue.length;
}

/** 加权随机选取敌人类型 */
function weightedPick(types, waveNum) {
  // 高波次时更倾向出现高级敌人
  const weights = types.map(key => {
    const cfg = ENEMY_TYPES[key];
    return cfg.minWave <= waveNum ? cfg.reward : 0;
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;
  for (let i = 0; i < types.length; i++) {
    r -= weights[i];
    if (r <= 0) return types[i];
  }
  return types[0];
}

/** 更新波次生成 (在 game loop update 中调用) */
function updateWaveSpawn(dt) {
  if (!waveActive) return;
  if (waveSpawnQueue.length === 0) return;

  waveSpawnTimer -= dt;
  if (waveSpawnTimer <= 0) {
    const spawn = waveSpawnQueue.shift();
    spawnEnemy(spawn.typeKey, Game.wave);
    // 下一个生成间隔
    if (waveSpawnQueue.length > 0) {
      waveSpawnTimer = clamp(
        SPAWN_INTERVAL_MAX - Game.wave * 0.04,
        SPAWN_INTERVAL_MIN,
        SPAWN_INTERVAL_MAX
      );
    }
  }
}

/** 敌人被击杀 */
function onEnemyKilled(enemy) {
  Game.gold += enemy.reward;
  Game.score += enemy.reward * 10;
  updateUI();
}

/** 敌人到达终点 (在 enemy.update 中触发，需要在 update 中检查) */
function handleEnemyReachedEnd(enemy) {
  Game.lives -= enemy.livesCost;
  updateUI();

  // 屏幕闪红
  const overlay = document.getElementById('game-canvas');
  overlay.style.boxShadow = '0 0 60px rgba(255, 0, 0, 0.5)';
  setTimeout(() => {
    overlay.style.boxShadow = '0 0 40px rgba(0, 229, 255, 0.1)';
  }, 200);
}
