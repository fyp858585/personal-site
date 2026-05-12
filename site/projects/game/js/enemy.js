// ===== 像素要塞 · 敌人系统 =====

class Enemy {
  constructor(typeKey, waveNum) {
    const cfg = ENEMY_TYPES[typeKey];
    this.typeKey = typeKey;
    this.name = cfg.name;
    this.maxHp = Math.round(cfg.hp * Math.pow(HP_SCALE, waveNum - 1));
    this.hp = this.maxHp;
    this.baseSpeed = cfg.speed;
    this.speed = cfg.speed;
    this.reward = cfg.reward;
    this.livesCost = cfg.livesCost;
    this.size = cfg.size;
    this.color = cfg.color;
    this.slowResist = cfg.slowResist;
    this.healAura = cfg.healAura;
    this.isBoss = cfg.boss || false;

    // 位置
    this.pathDist = 0;        // 沿路径已行进距离
    this.x = 0;
    this.y = 0;
    this.dead = false;
    this.reachedEnd = false;

    // 减速
    this.slowAmount = 0;
    this.slowTimer = 0;

    // 受伤闪烁
    this.hitFlash = 0;

    // 医疗光环冷却
    this.healCooldown = 0;

    // 更新初始位置
    const pos = getPositionOnPath(0);
    this.x = pos.x;
    this.y = pos.y;
  }

  update(dt) {
    if (this.dead || this.reachedEnd) return;

    // 减速处理
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) {
        this.slowAmount = 0;
      }
    }
    const effectiveSpeed = this.baseSpeed * (1 - this.slowAmount * (1 - this.slowResist));

    // 移动
    this.pathDist += effectiveSpeed * 60 * dt; // speed is px/frame at 60fps
    const pos = getPositionOnPath(this.pathDist);

    if (pos.finished) {
      this.reachedEnd = true;
      return;
    }
    this.x = pos.x;
    this.y = pos.y;

    // 受伤闪烁衰减
    if (this.hitFlash > 0) this.hitFlash -= dt;

    // 医疗光环
    if (this.healAura > 0) {
      this.healCooldown -= dt;
      if (this.healCooldown <= 0) {
        this.healCooldown = 1.0; // 每秒治疗一次
        this.healNearby(dt);
      }
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 0.1;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
  }

  applySlow(amount, duration) {
    // 取最强减速
    if (amount > this.slowAmount) {
      this.slowAmount = amount;
    }
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  healNearby(dt) {
    for (const other of Game.enemies) {
      if (other === this || other.dead || other.reachedEnd) continue;
      if (dist(this.x, this.y, other.x, other.y) < CELL_SIZE * 2) {
        other.hp = Math.min(other.maxHp, other.hp + this.healAura * dt);
      }
    }
  }

  draw(ctx) {
    if (this.dead || this.reachedEnd) return;
    const s = this.size;

    // Boss 光晕
    if (this.isBoss) {
      ctx.fillStyle = 'rgba(255, 68, 102, 0.2)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, s + 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 身体
    const bodyColor = this.hitFlash > 0 ? '#ffffff' : this.color;
    ctx.fillStyle = bodyColor;
    ctx.fillRect(this.x - s / 2, this.y - s / 2, s, s);

    // 像素边框
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x - s / 2, this.y - s / 2, s, s);

    // 眼睛 (boss 更大)
    const eyeSize = this.isBoss ? 4 : 2;
    ctx.fillStyle = '#000';
    ctx.fillRect(this.x - s / 4 - eyeSize / 2, this.y - s / 6, eyeSize, eyeSize);
    ctx.fillRect(this.x + s / 4 - eyeSize / 2, this.y - s / 6, eyeSize, eyeSize);

    // 血条
    if (this.hp < this.maxHp) {
      const barW = s + 8;
      const barH = 3;
      const barX = this.x - barW / 2;
      const barY = this.y - s / 2 - 6;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);
      const hpPct = this.hp / this.maxHp;
      const hpColor = hpPct > 0.5 ? '#44ff88' : hpPct > 0.25 ? '#ffd740' : '#ff4466';
      ctx.fillStyle = hpColor;
      ctx.fillRect(barX, barY, barW * hpPct, barH);
    }
  }
}

/** 生成敌人 (用于波次系统) */
function spawnEnemy(typeKey, waveNum) {
  const enemy = new Enemy(typeKey, waveNum);
  Game.enemies.push(enemy);
  return enemy;
}
