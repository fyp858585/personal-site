// ===== 像素要塞 · 塔系统 =====

class Tower {
  constructor(gridX, gridY, typeKey) {
    const cfg = TOWER_TYPES[typeKey];
    this.gridX = gridX;
    this.gridY = gridY;
    this.x = gridX * CELL_SIZE + CELL_SIZE / 2;
    this.y = gridY * CELL_SIZE + CELL_SIZE / 2;
    this.typeKey = typeKey;
    this.level = 1;

    // 从配置复制属性
    this.baseDamage = cfg.damage;
    this.baseRange = cfg.range;
    this.baseFireRate = cfg.fireRate;
    this.bulletSpeed = cfg.bulletSpeed;
    this.color = cfg.color;
    this.bulletColor = cfg.bulletColor;
    this.splash = cfg.splash || 0;
    this.slowAmount = cfg.slowAmount || 0;
    this.slowDuration = cfg.slowDuration || 0;
    this.chainCount = cfg.chainCount || 0;
    this.chainRange = cfg.chainRange || 0;

    // 攻击冷却
    this.fireCooldown = 0;
    this.target = null;

    // 动画
    this.rotation = 0;
    this.animTimer = 0;

    // 总花费 (用于出售计算)
    this.totalSpent = cfg.cost;
  }

  getRange() {
    const mult = UPGRADE_MULTIPLIERS[this.level].range;
    return this.baseRange * mult;
  }

  getDamage() {
    let dmg = this.baseDamage * UPGRADE_MULTIPLIERS[this.level].damage;
    // Lv3 终极技能额外伤害
    if (this.level === 3 && this.typeKey === 'tesla') {
      dmg *= 1.2; // 弹射伤害递增
    }
    return dmg;
  }

  getFireRate() {
    return this.baseFireRate;
  }

  canUpgrade() {
    return this.level < 3;
  }

  getUpgradeCost() {
    if (!this.canUpgrade()) return Infinity;
    const cfg = TOWER_TYPES[this.typeKey];
    return Math.round(cfg.cost * UPGRADE_MULTIPLIERS[this.level + 1].costMult);
  }

  getSellValue() {
    return Math.round(this.totalSpent * SELL_REFUND);
  }

  getName() {
    const cfg = TOWER_TYPES[this.typeKey];
    return cfg.name + UPGRADE_MULTIPLIERS[this.level].nameSuffix;
  }

  upgrade() {
    if (!this.canUpgrade()) return false;
    const cost = this.getUpgradeCost();
    this.level++;
    this.totalSpent += cost;
    return true;
  }

  update(dt) {
    this.fireCooldown -= dt;
    this.animTimer += dt;

    // 寻找目标
    if (!this.target || this.target.dead || this.target.reachedEnd) {
      this.target = this.findTarget();
    }

    // 检查目标是否仍在范围内
    if (this.target) {
      const d = dist(this.x, this.y, this.target.x, this.target.y);
      if (d > this.getRange() * CELL_SIZE) {
        this.target = this.findTarget();
      }
    }

    // 开火
    if (this.target && this.fireCooldown <= 0) {
      this.fire();
      this.fireCooldown = this.getFireRate();
    }
  }

  findTarget() {
    const range = this.getRange() * CELL_SIZE;
    let best = null;
    let bestDist = Infinity;

    // 优先攻击路径上最远的敌人 (离出口最近的)
    for (const enemy of Game.enemies) {
      if (enemy.dead || enemy.reachedEnd) continue;
      const d = dist(this.x, this.y, enemy.x, enemy.y);
      if (d <= range && enemy.pathDist > bestDist) {
        bestDist = enemy.pathDist;
        best = enemy;
      }
    }
    return best;
  }

  fire() {
    if (!this.target) return;

    const cfg = TOWER_TYPES[this.typeKey];

    if (this.typeKey === 'tesla') {
      // 连锁闪电
      spawnChainLightning(this, this.target);
    } else {
      // 普通弹道
      createProjectile(this, this.target);
    }
  }

  draw(ctx) {
    const s = CELL_SIZE * 0.7;
    const x = this.x;
    const y = this.y;

    // 底座
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - s / 2, y - s / 2, s, s);

    // 塔身颜色
    const towerColor = this.color;
    ctx.fillStyle = towerColor;
    const inner = s * 0.6;
    ctx.fillRect(x - inner / 2, y - inner / 2, inner, inner);

    // 等级标记
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (this.level === 2) {
      ctx.fillText('II', x, y - s / 2 - 8);
    } else if (this.level === 3) {
      ctx.fillText('★', x, y - s / 2 - 8);
    }

    // 攻击动画 (塔身脉冲)
    if (this.fireCooldown > this.getFireRate() * 0.8) {
      const glow = (this.fireCooldown / this.getFireRate()) * 8;
      ctx.strokeStyle = towerColor;
      ctx.lineWidth = glow;
      ctx.globalAlpha = 0.3;
      ctx.strokeRect(x - inner / 2, y - inner / 2, inner, inner);
      ctx.globalAlpha = 1;
    }
  }
}

// ---- 塔操作函数 ----

/** 选择塔类型开始放置 */
function selectTowerType(typeKey) {
  const cfg = TOWER_TYPES[typeKey];
  if (Game.gold < cfg.cost) return; // 钱不够
  if (Game.placingType === typeKey) {
    Game.placingType = null;
  } else {
    Game.placingType = typeKey;
    Game.selectedTower = null;
  }
  updateUI();
}

/** 在地图上放置塔 */
function placeTower(gx, gy, typeKey) {
  if (!isBuildable(gx, gy)) return;
  if (Game.towers.find(t => t.gridX === gx && t.gridY === gy)) return;

  const cfg = TOWER_TYPES[typeKey];
  if (Game.gold < cfg.cost) return;

  Game.gold -= cfg.cost;
  const tower = new Tower(gx, gy, typeKey);
  Game.towers.push(tower);
  Game.placingType = null;
  Game.selectedTower = tower;
  updateUI();
}

/** 选中已有塔 */
function selectTower(tower) {
  Game.selectedTower = tower;
  Game.placingType = null;
  updateUI();
}

/** 升级塔 */
function upgradeTower(tower) {
  if (!tower.canUpgrade()) return;
  const cost = tower.getUpgradeCost();
  if (Game.gold < cost) return;
  Game.gold -= cost;
  tower.upgrade();
  updateUI();
}

/** 出售塔 */
function sellTower(tower) {
  const refund = tower.getSellValue();
  Game.gold += refund;
  Game.towers = Game.towers.filter(t => t !== tower);
  Game.selectedTower = null;
  updateUI();
}
