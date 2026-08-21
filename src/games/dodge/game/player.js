export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 12; // Fair core collision radius (strictly 12px)
    this.visualRadius = 18; // Crisp, high-clarity visual footprint (18px)
    this.baseSpeed = 360; // px/sec

    this.health = 3;
    this.maxHealth = 3;

    this.invulnTimer = 0; // seconds
    this.shieldActive = false;

    // Powerup Timers (seconds)
    this.speedTimer = 0;
    this.slowTimer = 0;
    this.doubleTimer = 0;
    this.magnetTimer = 0;
    this.frenzyTimer = 0;
  }

  update(dt, inputDir, bounds) {
    // Update powerup & invulnerability timers
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.speedTimer > 0) this.speedTimer = Math.max(0, this.speedTimer - dt);
    if (this.slowTimer > 0) this.slowTimer = Math.max(0, this.slowTimer - dt);
    if (this.doubleTimer > 0) this.doubleTimer = Math.max(0, this.doubleTimer - dt);
    if (this.magnetTimer > 0) this.magnetTimer = Math.max(0, this.magnetTimer - dt);
    if (this.frenzyTimer > 0) this.frenzyTimer = Math.max(0, this.frenzyTimer - dt);

    // Apply speed multiplier
    const speedMult = this.speedTimer > 0 ? 1.55 : 1.0;
    const speed = this.baseSpeed * speedMult;

    // Smooth physics acceleration
    const targetVx = inputDir.x * speed;
    const targetVy = inputDir.y * speed;

    this.vx += (targetVx - this.vx) * Math.min(1, dt * 18);
    this.vy += (targetVy - this.vy) * Math.min(1, dt * 18);

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Constrain to arena bounds
    const minX = bounds.left + this.radius;
    const maxX = bounds.right - this.radius;
    const minY = bounds.top + this.radius;
    const maxY = bounds.bottom - this.radius;

    if (this.x < minX) { this.x = minX; this.vx = 0; }
    if (this.x > maxX) { this.x = maxX; this.vx = 0; }
    if (this.y < minY) { this.y = minY; this.vy = 0; }
    if (this.y > maxY) { this.y = maxY; this.vy = 0; }
  }

  takeDamage() {
    if (this.invulnTimer > 0) return false; // Invulnerable

    if (this.shieldActive) {
      this.shieldActive = false;
      this.invulnTimer = 1.0;
      return 'SHIELD_BREAK';
    }

    this.health = Math.max(0, this.health - 1);
    this.invulnTimer = 1.3; // 1.3s invulnerability post hit
    return 'HIT';
  }

  draw(ctx) {
    ctx.save();
    const r = this.visualRadius || 18;

    // Invulnerability flashing
    if (this.invulnTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // 1. Frenzy Flame Aura
    if (this.frenzyTimer > 0) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, r + 14 + Math.sin(Date.now() / 60) * 3, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffb703';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ff3562';
      ctx.shadowBlur = 18;
      ctx.stroke();
    }

    // 2. Outer Soft Radial Glow
    ctx.beginPath();
    ctx.arc(this.x, this.y, r + 7, 0, Math.PI * 2);
    ctx.fillStyle = this.frenzyTimer > 0 ? 'rgba(255, 183, 3, 0.4)' : this.speedTimer > 0 ? 'rgba(0, 242, 254, 0.35)' : 'rgba(0, 242, 254, 0.22)';
    ctx.fill();

    // 3. Shield Bubble
    if (this.shieldActive) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, r + 10, 0, Math.PI * 2);
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 14;
      ctx.stroke();
    }

    // 4. Bright Primary Circular Body
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = this.frenzyTimer > 0 ? '#ffb703' : this.speedTimer > 0 ? '#00f2fe' : '#00f2fe';
    ctx.shadowBlur = 12;
    ctx.fill();

    // 5. Crisp Neon Ring Accent
    ctx.beginPath();
    ctx.arc(this.x, this.y, r - 2, 0, Math.PI * 2);
    ctx.strokeStyle = this.frenzyTimer > 0 ? '#ff3562' : this.speedTimer > 0 ? '#00f2fe' : '#00f2fe';
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 0;
    ctx.stroke();

    // 6. High-Contrast Inner Core Dot
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = this.frenzyTimer > 0 ? '#ff3562' : this.speedTimer > 0 ? '#00f2fe' : '#00f2fe';
    ctx.fill();

    ctx.restore();
  }
}

