export class Collectible {
  constructor(type, x, y, options = {}) {
    this.type = type; // 'SCORE' | 'POWERUP'
    this.subType = options.subType || null; // 'SHIELD' | 'SPEED' | 'SLOW' | 'DOUBLE' | 'MAGNET'
    this.value = options.value || 100; // 100 | 250 | 500 | 1000
    this.x = x;
    this.y = y;
    
    // Scale size slightly by tier
    if (type === 'SCORE') {
      if (this.value === 1000) this.radius = 14;
      else if (this.value === 500) this.radius = 12;
      else if (this.value === 250) this.radius = 11;
      else this.radius = 10;
    } else {
      this.radius = 15;
    }

    this.pulse = Math.random() * Math.PI * 2;
  }

  update(dt, player) {
    this.pulse += dt * 4;

    // Magnet attraction towards player
    if (this.type === 'SCORE' && player.magnetTimer > 0) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 280 && dist > 0) {
        const pullSpeed = 480 * (1 - dist / 280);
        this.x += (dx / dist) * pullSpeed * dt;
        this.y += (dy / dist) * pullSpeed * dt;
      }
    }
  }

  draw(ctx) {
    ctx.save();

    const pulseSin = Math.sin(this.pulse);
    const scale = 1 + pulseSin * 0.12;

    if (this.type === 'SCORE') {
      const color = this.getTierColor();
      const r = 15.5 * scale; // Crisp visual radius (collision: 10-14px)

      // 1. Subtle Outer Glowing Aura Ring
      ctx.beginPath();
      ctx.arc(this.x, this.y, r * 1.35, 0, Math.PI * 2);
      ctx.fillStyle = this.getTierAuraColor();
      ctx.fill();

      // 2. High-Contrast Outer Silhouette Diamond (Faceted Gem)
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - r * 1.15); // Top
      ctx.lineTo(this.x + r * 0.95, this.y); // Right
      ctx.lineTo(this.x, this.y + r * 1.15); // Bottom
      ctx.lineTo(this.x - r * 0.95, this.y); // Left
      ctx.closePath();

      // Gem Base Fill + Glow
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = this.value >= 500 ? 16 : 10;
      ctx.fill();

      // Sharp High-Contrast Gem Border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
      ctx.stroke();

      // 3. Inner Facet Highlighting (Crystalline Cut)
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - r * 1.15);
      ctx.lineTo(this.x, this.y + r * 1.15);
      ctx.moveTo(this.x - r * 0.95, this.y);
      ctx.lineTo(this.x + r * 0.95, this.y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 4. Center Radiant Sparkle Star
      const sparkleSize = r * 0.45;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, sparkleSize * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Small 4-point sparkle flare
      ctx.beginPath();
      ctx.moveTo(this.x - sparkleSize, this.y);
      ctx.lineTo(this.x + sparkleSize, this.y);
      ctx.moveTo(this.x, this.y - sparkleSize);
      ctx.lineTo(this.x, this.y + sparkleSize);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Text label for higher-tier gems
      if (this.value >= 250) {
        ctx.font = 'bold 10px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(`+${this.value}`, this.x, this.y - r - 8);
      }
    } else {
      // Powerup Bubble (Visual radius: 17px)
      const r = 17 * scale;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(18, 18, 28, 0.92)';
      ctx.strokeStyle = this.getPowerupColor();
      ctx.lineWidth = 2.5;
      ctx.shadowColor = this.getPowerupColor();
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.stroke();

      // Symbol
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.fillText(this.getPowerupSymbol(), this.x, this.y + 1);
    }

    ctx.restore();
  }

  getTierAuraColor() {
    switch (this.value) {
      case 250: return 'rgba(255, 112, 67, 0.22)';
      case 500: return 'rgba(0, 242, 254, 0.25)';
      case 1000: return 'rgba(217, 70, 239, 0.28)';
      default: return 'rgba(255, 209, 102, 0.22)';
    }
  }

  getTierColor() {
    switch (this.value) {
      case 250: return '#ff7043'; // 🟠 Orange
      case 500: return '#00f2fe'; // 🔵 Cyan/Blue
      case 1000: return '#ab47bc'; // 🟣 Purple
      default: return '#ffb703'; // 🟡 Yellow (+100)
    }
  }

  getPowerupColor() {
    switch (this.subType) {
      case 'SHIELD': return '#00f2fe';
      case 'SPEED': return '#ffd166';
      case 'SLOW': return '#a06cd5';
      case 'DOUBLE': return '#ff3562';
      case 'MAGNET': return '#ffb703';
      default: return '#ffffff';
    }
  }

  getPowerupSymbol() {
    switch (this.subType) {
      case 'SHIELD': return '🛡️';
      case 'SPEED': return '⚡';
      case 'SLOW': return '⏱️';
      case 'DOUBLE': return '🔥';
      case 'MAGNET': return '🧲';
      default: return '✨';
    }
  }
}

// Helper to calculate target value based on Danger Level
export function getCollectibleTierForLevel(dangerLevel) {
  const rand = Math.random();
  if (dangerLevel === 1) {
    return 100;
  } else if (dangerLevel === 2) {
    return rand < 0.2 ? 250 : 100;
  } else if (dangerLevel === 3) {
    if (rand < 0.35) return 250;
    return 100;
  } else if (dangerLevel === 4) {
    if (rand < 0.15) return 500;
    if (rand < 0.45) return 250;
    return 100;
  } else {
    // Level 5+
    if (rand < 0.12) return 1000;
    if (rand < 0.30) return 500;
    if (rand < 0.60) return 250;
    return 100;
  }
}

