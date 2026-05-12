// ===== 像素要塞 · 弹道系统 =====

class Projectile {
  constructor(x, y, target, tower) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.tower = tower;
    this.dead = false;
    this.speed = tower.bulletSpeed * 60; // px/s
    this.damage = tower.getDamage();
    this.typeKey = tower.typeKey;
    this.level = tower.level;
    this.trail = []; // 拖尾效果
  }

  update(dt) {
    if (this.dead) return;
    if (!this.target || this.target.dead || this.target.reachedEnd) {
      this.dead = true;
      return;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const d = Math.hypot(dx, dy);

    if (d < this.target.size / 2) {
      this.hit();
      return;
    }

    const vx = (dx / d) * this.speed * dt;
    const vy = (dy / d) * this.speed * dt;
    this.x += vx;
    this.y += vy;

    // 拖尾
    this.trail.push({ x: this.x, y: this.y, life: 0.15 });
  }

  hit() {
    this.dead = true;
    this.applyDamage(this.target);

    // 溅射
    if (this.tower.splash > 0) {
      this.applySplash();
    }

    // 减速
    if (this.tower.slowAmount > 0) {
      this.target.applySlow(this.tower.slowAmount, this.tower.slowDuration);
    }

    // 粒子效果
    spawnHitParticles(this.target.x, this.target.y, this.tower.color);
  }

  applyDamage(enemy) {
    let dmg = this.damage;

    // Lv3 箭塔：10% 概率一击必杀
    if (this.level === 3 && this.typeKey === 'arrow' && Math.random() < 0.1) {
      dmg = enemy.hp;
    }

    // Lv3 炮塔：燃烧 DoT
    if (this.level === 3 && this.typeKey === 'cannon') {
      enemy.burnTimer = 3.0;
      enemy.burnDps = this.damage * 0.2;
    }

    enemy.takeDamage(dmg);
    spawnDamageNumber(enemy.x, enemy.y, Math.round(dmg));

    if (enemy.dead) {
      onEnemyKilled(enemy);
    }
  }

  applySplash() {
    const splashRange = this.tower.splash * CELL_SIZE;
    for (const enemy of Game.enemies) {
      if (enemy === this.target || enemy.dead || enemy.reachedEnd) continue;
      if (dist(this.target.x, this.target.y, enemy.x, enemy.y) < splashRange) {
        enemy.takeDamage(this.damage * 0.5);
        spawnDamageNumber(enemy.x, enemy.y, Math.round(this.damage * 0.5));
        if (enemy.dead) onEnemyKilled(enemy);
      }
    }
  }

  draw(ctx) {
    if (this.dead) return;

    // 拖尾
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      t.life -= 0.016;
      if (t.life > 0) {
        ctx.fillStyle = this.tower.bulletColor;
        ctx.globalAlpha = t.life * 3;
        ctx.fillRect(t.x - 2, t.y - 2, 4, 4);
        ctx.globalAlpha = 1;
      }
    }
    this.trail = this.trail.filter(t => t.life > 0);

    // 弹体
    ctx.fillStyle = this.tower.bulletColor;
    const s = this.typeKey === 'cannon' ? 6 : 4;
    ctx.fillRect(this.x - s / 2, this.y - s / 2, s, s);

    // 发光
    ctx.fillStyle = this.tower.bulletColor;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(this.x - s, this.y - s, s * 2, s * 2);
    ctx.globalAlpha = 1;
  }
}

// ---- 连锁闪电 ----
function spawnChainLightning(tower, firstTarget) {
  const dmg = tower.getDamage();
  const chainCount = tower.chainCount + (tower.level === 3 ? 1 : 0);
  let lastTarget = firstTarget;
  lastTarget.takeDamage(dmg);
  spawnDamageNumber(lastTarget.x, lastTarget.y, Math.round(dmg));
  if (lastTarget.dead) onEnemyKilled(lastTarget);

  const hitTargets = new Set([firstTarget]);

  for (let i = 1; i < chainCount; i++) {
    const chainRange = tower.chainRange * CELL_SIZE;
    let best = null;
    let bestDist = Infinity;
    for (const enemy of Game.enemies) {
      if (hitTargets.has(enemy) || enemy.dead || enemy.reachedEnd) continue;
      const d = dist(lastTarget.x, lastTarget.y, enemy.x, enemy.y);
      if (d < chainRange && d < bestDist) {
        bestDist = d;
        best = enemy;
      }
    }
    if (!best) break;

    const chainDmg = dmg * (1 + i * 0.2); // 递增伤害
    best.takeDamage(chainDmg);
    spawnDamageNumber(best.x, best.y, Math.round(chainDmg));
    if (best.dead) onEnemyKilled(best);
    hitTargets.add(best);

    // 闪电特效
    spawnLightningBolt(lastTarget.x, lastTarget.y, best.x, best.y, tower.color);
    lastTarget = best;
  }
}

// ---- 弹道创建 ----
function createProjectile(tower, target) {
  const proj = new Projectile(tower.x, tower.y, target, tower);
  Game.projectiles.push(proj);
}

// ---- 粒子/特效 ----
function spawnHitParticles(x, y, color) {
  for (let i = 0; i < 6; i++) {
    Game.particles.push({
      x, y,
      vx: randFloat(-80, 80),
      vy: randFloat(-80, 80),
      life: 0.3 + Math.random() * 0.3,
      maxLife: 0.3,
      color,
      size: 2 + Math.random() * 3,
      dead: false,
      update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
        if (this.life <= 0) this.dead = true;
      },
      draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        ctx.globalAlpha = 1;
      }
    });
  }
}

function spawnDamageNumber(x, y, amount) {
  Game.particles.push({
    x, y,
    vy: -40,
    life: 0.8,
    dead: false,
    text: '+' + amount + 'g',
    update(dt) {
      this.y += this.vy * dt;
      this.vy *= 0.97;
      this.life -= dt;
      if (this.life <= 0) this.dead = true;
    },
    draw(ctx) {
      ctx.fillStyle = '#ffd740';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.globalAlpha = this.life / 0.8;
      ctx.fillText(this.text, this.x, this.y);
      ctx.globalAlpha = 1;
    }
  });
}

function spawnLightningBolt(x1, y1, x2, y2, color) {
  // 锯齿闪电
  const segments = 8;
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const bx = lerp(x1, x2, t);
    const by = lerp(y1, y2, t);
    const offset = (i > 0 && i < segments) ? randFloat(-16, 16) : 0;
    points.push({ x: bx + offset, y: by + offset });
  }

  Game.particles.push({
    points, color,
    life: 0.15,
    dead: false,
    update(dt) {
      this.life -= dt;
      if (this.life <= 0) this.dead = true;
    },
    draw(ctx) {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = this.life / 0.15;
      ctx.beginPath();
      ctx.moveTo(this.points[0].x, this.points[0].y);
      for (let i = 1; i < this.points.length; i++) {
        ctx.lineTo(this.points[i].x, this.points[i].y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  });
}
