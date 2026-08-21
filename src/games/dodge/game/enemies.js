export class Enemy {
  constructor(type, x, y, options = {}) {
    this.type = type; // 'STATIC' | 'BOUNCER' | 'CHASER' | 'SHOOTER' | 'PROJECTILE'
    this.x = x;
    this.y = y;

    this.radius = options.radius || (type === 'STATIC' ? 12 : type === 'PROJECTILE' ? 7 : type === 'CHASER' ? 11 : 14);
    this.vx = options.vx || 0;
    this.vy = options.vy || 0;
    this.speed = options.speed || (type === 'CHASER' ? 130 : 180);

    this.shootTimer = 0; // for SHOOTER
    this.pulse = Math.random() * Math.PI * 2;

    // Projectile finite lifespan and wall-bounce cap
    this.lifespan = type === 'PROJECTILE' ? 5.5 : Infinity;
    this.bounces = 0;
    this.isDead = false;
  }

  update(dt, player, bounds, isSlowed) {
    const speedMult = isSlowed ? 0.5 : 1.0;
    this.pulse += dt * 5;

    if (this.type === 'PROJECTILE') {
      this.lifespan -= dt;
      if (this.lifespan <= 0) {
        this.isDead = true;
        return;
      }
    }

    if (this.type === 'BOUNCER' || this.type === 'PROJECTILE') {
      this.x += this.vx * speedMult * dt;
      this.y += this.vy * speedMult * dt;

      // Bounce off bounds
      if (this.x - this.radius < bounds.left) {
        this.x = bounds.left + this.radius;
        this.vx *= -1;
        if (this.type === 'PROJECTILE') this.bounces++;
      }
      if (this.x + this.radius > bounds.right) {
        this.x = bounds.right - this.radius;
        this.vx *= -1;
        if (this.type === 'PROJECTILE') this.bounces++;
      }
      if (this.y - this.radius < bounds.top) {
        this.y = bounds.top + this.radius;
        this.vy *= -1;
        if (this.type === 'PROJECTILE') this.bounces++;
      }
      if (this.y + this.radius > bounds.bottom) {
        this.y = bounds.bottom - this.radius;
        this.vy *= -1;
        if (this.type === 'PROJECTILE') this.bounces++;
      }

      if (this.type === 'PROJECTILE' && this.bounces >= 3) {
        this.isDead = true;
      }
    } else if (this.type === 'CHASER') {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        const targetVx = (dx / dist) * this.speed * speedMult;
        const targetVy = (dy / dist) * this.speed * speedMult;
        
        // Predictable smooth turn acceleration so player can dodge
        this.vx += (targetVx - this.vx) * Math.min(1, dt * 3.5);
        this.vy += (targetVy - this.vy) * Math.min(1, dt * 3.5);

        this.x += this.vx * dt;
        this.y += this.vy * dt;
      }
    }
  }

  shouldShoot(dt) {
    if (this.type !== 'SHOOTER') return false;
    this.shootTimer += dt;
    if (this.shootTimer >= 2.6) {
      this.shootTimer = 0;
      return true;
    }
    return false;
  }

  draw(ctx) {
    ctx.save();

    if (this.type === 'STATIC') {
      const r = 15; // Visual radius (collision: 12px)
      // Outer subtle alert ring
      ctx.beginPath();
      ctx.arc(this.x, this.y, r + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 23, 68, 0.2)';
      ctx.fill();

      // Main Mine Body
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#ff1744';
      ctx.shadowColor = '#ff1744';
      ctx.shadowBlur = 10;
      ctx.fill();

      // Inner Warning Core
      ctx.beginPath();
      ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.fill();
    } else if (this.type === 'BOUNCER') {
      const r = 16.5; // Visual radius: 33px diameter (collision: 14px)
      // 1. Outer Soft Glow Aura
      ctx.beginPath();
      ctx.arc(this.x, this.y, r + 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 53, 98, 0.25)';
      ctx.fill();

      // 2. Solid Circular Body
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#ff3562';
      ctx.shadowColor = '#ff3562';
      ctx.shadowBlur = 12;
      ctx.fill();

      // 3. Crisp Inner Ring & Core
      ctx.beginPath();
      ctx.arc(this.x, this.y, r - 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(this.x, this.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    } else if (this.type === 'CHASER') {
      const angle = Math.atan2(this.vy || 1, this.vx || 1);
      ctx.translate(this.x, this.y);
      ctx.rotate(angle);

      // Chaser Arrowhead Shape (Visual footprint: 36px length, collision: 11px)
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-14, -13);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-14, 13);
      ctx.closePath();

      ctx.fillStyle = '#ff1744';
      ctx.shadowColor = '#ff3562';
      ctx.shadowBlur = 14;
      ctx.fill();

      // Crisp White Arrow Rim Highlight
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
      ctx.stroke();

      // Glowing Seeker Eye
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    } else if (this.type === 'SHOOTER') {
      const r = 18; // Visual radius (collision: 14px)
      const scale = 1 + Math.sin(this.pulse) * 0.06;

      // Outer Turret Armor Ring
      ctx.beginPath();
      ctx.arc(this.x, this.y, r * scale, 0, Math.PI * 2);
      ctx.fillStyle = '#8e0000';
      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ff1744';
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.stroke();

      // Crosshair Reticle
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(this.x - 5, this.y - 1.5, 10, 3);
      ctx.fillRect(this.x - 1.5, this.y - 5, 3, 10);
    } else if (this.type === 'PROJECTILE') {
      const r = 10.5; // Visual core radius: 21px diameter (collision: 7px)
      // 1. Plasma Radiant Halo
      ctx.beginPath();
      ctx.arc(this.x, this.y, r + 5.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 82, 82, 0.35)';
      ctx.fill();

      // 2. High-Intensity Plasma Bolt Core
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#ff1744';
      ctx.shadowColor = '#ff5252';
      ctx.shadowBlur = 10;
      ctx.fill();

      // 3. Hot White Center Dot
      ctx.beginPath();
      ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.fill();
    }

    ctx.restore();
  }
}

// Utility: Calculate safe spawn position ensuring minimum distance from player
export function getSafeSpawnPos(bounds, player, minDistance = 140) {
  let x, y, dist;
  let attempts = 0;
  const padding = 30;
  let maxDistCandidate = null;
  let maxDist = -1;

  const minX = bounds.left + padding;
  const maxX = Math.max(minX + 20, bounds.right - padding);
  const minY = bounds.top + padding;
  const maxY = Math.max(minY + 20, bounds.bottom - padding);

  do {
    x = Math.random() * (maxX - minX) + minX;
    y = Math.random() * (maxY - minY) + minY;
    
    dist = Math.hypot(x - player.x, y - player.y);

    if (dist > maxDist) {
      maxDist = dist;
      maxDistCandidate = { x, y };
    }

    attempts++;
  } while (dist < minDistance && attempts < 60);

  if (dist >= minDistance) {
    return { x, y };
  }

  return maxDistCandidate || { x, y };
}

