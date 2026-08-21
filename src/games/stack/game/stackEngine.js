/**
 * STACK Engine - Responsive Logical Game World (800w x Dynamic Logical Height), physics, overlap math, slicing debris, camera tracking, and HDPI canvas rendering.
 */

export const LOGICAL_WIDTH = 800;

export class StackEngine {
  constructor(physicalWidth = 1440, physicalHeight = 900) {
    this.blockHeight = 36;
    this.initialWidth = 260;
    this.minBlockWidth = 5;
    this.perfectThreshold = 6.0; // 6.0 logical pixels (~2.3% of initial block width)

    this.updateViewport(physicalWidth, physicalHeight, true);
  }

  updateViewport(physicalWidth, physicalHeight, isInitial = false) {
    const prevLogicalHeight = this.logicalHeight || 600;

    this.scale = (physicalWidth || 1440) / LOGICAL_WIDTH;
    this.logicalHeight = Math.max(400, (physicalHeight || 900) / this.scale);

    const heightDiff = this.logicalHeight - prevLogicalHeight;

    if (isInitial) {
      this.reset();
    } else if (heightDiff !== 0) {
      if (this.stack) {
        this.stack.forEach((b) => {
          b.y += heightDiff;
        });
      }
      if (this.movingBlock) {
        this.movingBlock.y += heightDiff;
      }
      if (this.stack && this.stack.length > 0) {
        const topBlock = this.stack[this.stack.length - 1];
        const currentTopY = this.movingBlock ? this.movingBlock.y : topBlock.y;
        const desiredYOnScreen = this.logicalHeight * 0.5;
        this.targetCameraY = Math.max(0, desiredYOnScreen - currentTopY);
      }
    }
  }

  reset() {
    this.score = 0;
    this.combo = 1;
    this.maxCombo = 1;
    this.height = 0;
    this.perfects = 0;
    this.perfectStreak = 0;

    this.flowMode = false;
    this.flowTimer = 0;

    this.activeEvent = null; // null | { type: 'SPEED'|'MIRROR'|'BLIND'|'DOUBLE', title: string, desc: string }
    this.eventBannerTimer = 0;

    this.visualTime = 0; // Monotonic visual animation clock

    this.gameOver = false;
    this.screenPulseTimer = 0;
    this.milestoneCameraTimer = 0;
    this.toastMessage = null;
    this.toastTimer = 0;

    const baseX = (LOGICAL_WIDTH - this.initialWidth) / 2;
    // Responsive base Y: 72% down logical viewport across all aspect ratios (desktop, tablet, mobile)
    const baseY = Math.max(300, (this.logicalHeight || 600) * 0.72);

    this.stack = [
      {
        x: baseX,
        y: baseY,
        width: this.initialWidth,
        height: this.blockHeight,
        hue: 200,
        isPerfect: false,
      },
    ];

    this.cameraY = 0;
    this.targetCameraY = 0;

    this.ambientParticles = [];
    this.debris = [];
    this.particles = [];
    this.floatingTexts = [];

    this.spawnMovingBlock();
  }

  getSpeedForHeight(heightIndex) {
    let baseSpeed = 240;
    if (heightIndex <= 5) {
      baseSpeed = 240 + heightIndex * 12; // 240 -> 300
    } else if (heightIndex <= 10) {
      baseSpeed = 300 + (heightIndex - 5) * 12; // 300 -> 360
    } else if (heightIndex <= 20) {
      baseSpeed = 360 + (heightIndex - 10) * 9; // 360 -> 450
    } else if (heightIndex <= 30) {
      baseSpeed = 450 + (heightIndex - 20) * 7; // 450 -> 520
    } else if (heightIndex <= 50) {
      baseSpeed = 520 + (heightIndex - 30) * 3; // 520 -> 580
    } else {
      baseSpeed = Math.min(620, 580 + (heightIndex - 50) * 1.5); // 580 -> 620 max
    }

    // Hard Base Speed Cap
    const MAX_BASE_SPEED = 620;
    baseSpeed = Math.min(baseSpeed, MAX_BASE_SPEED);

    // Multipliers: Flow Mode (1.15x) & SPEED Round (1.15x)
    let flowMultiplier = 1.0;
    if (this.flowMode) {
      flowMultiplier = 1.15;
    }

    let eventMultiplier = 1.0;
    if (this.activeEvent && this.activeEvent.type === 'SPEED') {
      eventMultiplier = 1.15;
    }

    // Combined Maximum Effective Speed Cap
    const MAX_EFFECTIVE_SPEED = 700;
    const finalSpeed = Math.min(baseSpeed * flowMultiplier * eventMultiplier, MAX_EFFECTIVE_SPEED);

    return finalSpeed;
  }

  spawnMovingBlock() {
    const topBlock = this.stack[this.stack.length - 1];
    const newHeightIndex = this.stack.length;
    const hue = (newHeightIndex * 14) % 360;

    const blockY = topBlock.y - this.blockHeight;

    let special = null;
    if (newHeightIndex >= 15 && (newHeightIndex - 15) % 8 === 0) {
      const eventTypes = [
        { type: 'SPEED', title: '⚡ SPEED ROUND', desc: 'Fast block movement' },
        { type: 'MIRROR', title: '🔄 MIRROR ROUND', desc: 'Reversed movement direction' },
        { type: 'BLIND', title: '👁️ BLIND ROUND', desc: 'Block pulses transparency' },
        { type: 'DOUBLE', title: '💥 DOUBLE SCORE', desc: '2X score reward for placement' },
      ];
      special = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      this.activeEvent = special;
      this.eventBannerTimer = 2.5;
    } else {
      this.activeEvent = null;
    }

    let fromLeft = newHeightIndex % 2 === 0;
    if (special && special.type === 'MIRROR') {
      fromLeft = !fromLeft;
    }

    const initialX = fromLeft ? -topBlock.width : LOGICAL_WIDTH;
    const finalDir = fromLeft ? 1 : -1;
    let speed = this.getSpeedForHeight(newHeightIndex);

    this.movingBlock = {
      x: initialX,
      y: blockY,
      width: topBlock.width,
      height: this.blockHeight,
      speed: speed,
      direction: finalDir,
      hue: hue,
      opacity: 1,
    };

    const currentTopY = blockY;
    const desiredYOnScreen = (this.logicalHeight || 600) * 0.5;
    this.targetCameraY = Math.max(0, desiredYOnScreen - currentTopY);

    if (newHeightIndex === 10 || newHeightIndex === 20 || newHeightIndex === 30 || newHeightIndex === 40) {
      this.milestoneCameraTimer = 0.35;
      this.showToast(`🏆 HEIGHT MILESTONE: ${newHeightIndex}!`);
    }
  }

  showToast(text) {
    this.toastMessage = text;
    this.toastTimer = 2.0;
  }

  dropBlock(callbacks = {}) {
    if (this.gameOver || !this.movingBlock) return null;

    const topBlock = this.stack[this.stack.length - 1];
    const mb = this.movingBlock;

    const delta = mb.x - topBlock.x;
    const absDelta = Math.abs(delta);

    const isPerfect = absDelta <= this.perfectThreshold;

    let placementResult = {
      isPerfect: false,
      scoreGained: 0,
      combo: this.combo,
      flowActive: this.flowMode,
      gameOver: false,
    };

    if (isPerfect) {
      mb.x = topBlock.x;
      const placedBlock = {
        x: mb.x,
        y: mb.y,
        width: mb.width,
        height: mb.height,
        hue: mb.hue,
        isPerfect: true,
      };
      this.stack.push(placedBlock);

      this.perfects += 1;
      this.perfectStreak += 1;
      this.combo += 1;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      let baseScore = 500;
      if (this.activeEvent && this.activeEvent.type === 'DOUBLE') {
        baseScore *= 2;
      }

      const flowMultiplier = this.flowMode ? 2 : 1;
      const scoreGained = Math.round(baseScore * Math.min(10, this.combo) * flowMultiplier);
      this.score += scoreGained;
      this.height = this.stack.length - 1;

      this.screenPulseTimer = 0.15;

      let streakText = `PERFECT! +${scoreGained}`;
      if (this.flowMode) streakText = `PERFECT! +${scoreGained} 2X`;

      if (this.perfectStreak === 5 && !this.flowMode) {
        this.flowMode = true;
        this.flowTimer = 8.0;
        this.showToast('🔥 PERFECT STREAK! FLOW MODE!');
        if (callbacks.onFlowMode) callbacks.onFlowMode();
      } else if (this.perfectStreak === 10) {
        this.showToast('⚡ 10 PERFECT STREAK! LEGENDARY!');
        this.spawnMilestoneSparkles(placedBlock.x + placedBlock.width / 2, placedBlock.y);
      } else if (this.perfectStreak > 1) {
        streakText = `PERFECT! x${this.perfectStreak} +${scoreGained}`;
      }

      if (this.flowMode && this.perfectStreak !== 5) {
        this.flowTimer = Math.min(10.0, this.flowTimer + 2.0);
      }

      if (this.combo === 5 || this.combo === 10 || this.combo === 15 || this.combo === 20) {
        this.addFloatingText(`🔥 x${this.combo} COMBO!`, placedBlock.x + placedBlock.width / 2, placedBlock.y - 35, '#ffb703');
      }

      this.spawnPerfectParticles(placedBlock.x + placedBlock.width / 2, placedBlock.y, mb.hue);
      this.addFloatingText(streakText, placedBlock.x + placedBlock.width / 2, placedBlock.y - 12, '#00f2fe');

      if (callbacks.onPerfect) callbacks.onPerfect(this.perfectStreak);

      placementResult.isPerfect = true;
      placementResult.scoreGained = scoreGained;
    } else {
      const newWidth = topBlock.width - absDelta;

      if (newWidth <= this.minBlockWidth) {
        this.gameOver = true;

        this.debris.push({
          x: mb.x,
          y: mb.y,
          width: mb.width,
          height: mb.height,
          hue: mb.hue,
          vx: mb.direction * 140,
          vy: -90,
          gravity: 850,
          angle: 0,
          vAngle: (Math.random() - 0.5) * 4,
          opacity: 1,
        });

        this.movingBlock = null;

        if (callbacks.onGameOver) callbacks.onGameOver();

        placementResult.gameOver = true;
        return placementResult;
      }

      let newX = topBlock.x;
      let overhangX = topBlock.x;
      let overhangWidth = absDelta;

      if (delta > 0) {
        newX = topBlock.x + delta;
        overhangX = topBlock.x + topBlock.width;
      } else {
        newX = topBlock.x;
        overhangX = mb.x;
      }

      const placedBlock = {
        x: newX,
        y: mb.y,
        width: newWidth,
        height: mb.height,
        hue: mb.hue,
        isPerfect: false,
      };
      this.stack.push(placedBlock);

      this.debris.push({
        x: overhangX,
        y: mb.y,
        width: overhangWidth,
        height: mb.height,
        hue: mb.hue,
        vx: (delta > 0 ? 1 : -1) * 90,
        vy: -50,
        gravity: 800,
        angle: 0,
        vAngle: (delta > 0 ? 1 : -1) * (1.5 + Math.random() * 2),
        opacity: 1,
      });

      const overlapPercent = newWidth / topBlock.width;
      this.perfectStreak = 0;

      if (overlapPercent < 0.5) {
        this.combo = 1;
        if (this.flowMode) {
          this.flowMode = false;
          this.showToast('FLOW ENDED');
        }
      } else if (overlapPercent >= 0.8) {
        this.combo += 1;
      }

      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      let baseScore = overlapPercent >= 0.8 ? 150 : 100;
      if (this.activeEvent && this.activeEvent.type === 'DOUBLE') {
        baseScore *= 2;
      }

      const flowMultiplier = this.flowMode ? 2 : 1;
      const scoreGained = Math.round(baseScore * Math.min(10, this.combo) * flowMultiplier);
      this.score += scoreGained;
      this.height = this.stack.length - 1;

      const isGood = overlapPercent >= 0.8;
      const labelText = isGood
        ? `GOOD +${scoreGained}${this.flowMode ? ' 2X' : ''}`
        : `+${scoreGained}${this.flowMode ? ' 2X' : ''}`;

      this.spawnSliceParticles(overhangX + overhangWidth / 2, mb.y, mb.hue, isGood ? 18 : 10);
      this.addFloatingText(labelText, placedBlock.x + placedBlock.width / 2, placedBlock.y - 12, isGood ? '#ffb703' : '#ffffff');

      if (this.combo === 5 || this.combo === 10 || this.combo === 15 || this.combo === 20) {
        this.addFloatingText(`🔥 x${this.combo} COMBO!`, placedBlock.x + placedBlock.width / 2, placedBlock.y - 35, '#ffb703');
      }

      if (callbacks.onHit) callbacks.onHit(this.combo);

      placementResult.scoreGained = scoreGained;
    }

    this.spawnMovingBlock();

    return placementResult;
  }

  update(dt) {
    const safeDt = Math.max(0, Math.min(0.1, dt || 0));
    dt = safeDt;
    this.visualTime += dt;

    this.cameraY += (this.targetCameraY - this.cameraY) * 0.08;

    if (this.screenPulseTimer > 0) {
      this.screenPulseTimer -= dt;
    }

    if (this.milestoneCameraTimer > 0) {
      this.milestoneCameraTimer -= dt;
    }

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) {
        this.toastMessage = null;
      }
    }

    if (this.flowMode) {
      this.flowTimer -= dt;
      if (this.flowTimer <= 0) {
        this.flowMode = false;
        this.flowTimer = 0;
        this.showToast('FLOW ENDED');
      }
    }

    if (this.eventBannerTimer > 0) {
      this.eventBannerTimer -= dt;
    }

    if (this.movingBlock && !this.gameOver) {
      const mb = this.movingBlock;
      mb.x += mb.speed * mb.direction * dt;

      if (mb.direction === 1 && mb.x + mb.width >= LOGICAL_WIDTH) {
        mb.x = LOGICAL_WIDTH - mb.width;
        mb.direction = -1;
      } else if (mb.direction === -1 && mb.x <= 0) {
        mb.x = 0;
        mb.direction = 1;
      }

      if (this.activeEvent && this.activeEvent.type === 'BLIND') {
        mb.opacity = 0.38 + Math.abs(Math.sin(this.visualTime * 5)) * 0.47;
      } else {
        mb.opacity = 1;
      }
    }

    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.vy += d.gravity * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.angle += d.vAngle * dt;
      d.opacity -= dt * 0.8;

      if (d.opacity <= 0 || d.y > (this.logicalHeight || 600) + 300) {
        this.debris.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= dt * p.decay;
      p.size = Math.max(0, p.size - dt * 2);

      if (p.alpha <= 0 || p.size <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= ft.vy * dt;
      ft.alpha -= dt * 1.1;

      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    if (this.height >= 30 && Math.random() < 0.25) {
      if (this.ambientParticles.length < 25) {
        this.ambientParticles.push({
          x: Math.random() * LOGICAL_WIDTH,
          y: -this.cameraY + Math.random() * (this.logicalHeight || 600),
          size: 1 + Math.random() * 2,
          alpha: 0.8,
          vy: -15 - Math.random() * 20,
        });
      }
    }

    for (let i = this.ambientParticles.length - 1; i >= 0; i--) {
      const ap = this.ambientParticles[i];
      ap.y += ap.vy * dt;
      ap.alpha -= dt * 0.4;
      if (ap.alpha <= 0) this.ambientParticles.splice(i, 1);
    }
  }

  spawnPerfectParticles(x, y, hue) {
    const count = 30;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= 120) break;
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.2;
      const speed = 140 + Math.random() * 240;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        size: 4 + Math.random() * 5,
        color: `hsl(${hue}, 100%, 75%)`,
        alpha: 1,
        decay: 1.1 + Math.random() * 0.7,
      });
    }
  }

  spawnMilestoneSparkles(x, y) {
    for (let i = 0; i < 35; i++) {
      if (this.particles.length >= 120) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 160 + Math.random() * 320;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 6,
        color: '#ffb703',
        alpha: 1,
        decay: 0.8,
      });
    }
  }

  spawnSliceParticles(x, y, hue, count = 12) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= 120) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 140;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 3,
        color: `hsl(${hue}, 90%, 65%)`,
        alpha: 1,
        decay: 2.0 + Math.random() * 1.0,
      });
    }
  }

  addFloatingText(text, x, y, color = '#ffffff') {
    if (this.floatingTexts.length >= 10) this.floatingTexts.shift();
    this.floatingTexts.push({
      text,
      x,
      y,
      vy: 55,
      alpha: 1,
      color,
    });
  }

  render(ctx, physicalWidth, physicalHeight, dpr = 1) {
    this.updateViewport(physicalWidth, physicalHeight);

    ctx.clearRect(0, 0, physicalWidth * dpr, physicalHeight * dpr);

    ctx.save();
    ctx.scale(dpr * this.scale, dpr * this.scale);

    if (this.screenPulseTimer > 0) {
      const pulseOffset = (Math.random() - 0.5) * 5;
      ctx.translate(pulseOffset, pulseOffset);
    }

    let camY = this.cameraY;
    if (this.milestoneCameraTimer > 0) {
      camY += Math.sin(this.milestoneCameraTimer * Math.PI * 5) * 5;
    }
    ctx.translate(0, camY);

    this.renderBackgroundGrid(ctx, this.logicalHeight);

    const logHeight = this.logicalHeight || 600;
    const stackLen = this.stack.length;
    for (let idx = 0; idx < stackLen; idx++) {
      const b = this.stack[idx];
      // Frustum culling: Skip blocks that have moved outside visible screen
      const screenY = b.y + camY;
      if (screenY > logHeight + 60 || screenY + b.height < -60) {
        continue;
      }
      const isTop = idx >= stackLen - 2;
      this.renderBlock(ctx, b, false, idx, isTop);
    }

    this.debris.forEach((d) => {
      const screenY = d.y + camY;
      if (screenY > logHeight + 100 || screenY + d.height < -100) return;
      ctx.save();
      ctx.translate(d.x + d.width / 2, d.y + d.height / 2);
      ctx.rotate(d.angle);
      ctx.globalAlpha = Math.max(0, d.opacity);

      const hue = d.hue;
      ctx.fillStyle = `hsl(${hue}, 70%, 45%)`;
      ctx.fillRect(-d.width / 2, -d.height / 2, d.width, d.height);

      ctx.restore();
    });

    if (this.movingBlock && !this.gameOver) {
      const topBlock = this.stack[this.stack.length - 1];
      const delta = Math.abs(this.movingBlock.x - topBlock.x);

      if (delta <= 16) {
        ctx.save();
        const guideX = Math.max(this.movingBlock.x, topBlock.x);
        const guideW = Math.min(
          this.movingBlock.x + this.movingBlock.width,
          topBlock.x + topBlock.width
        ) - guideX;

        if (guideW > 0) {
          ctx.fillStyle = 'rgba(0, 242, 254, 0.14)';
          ctx.fillRect(guideX, this.movingBlock.y - 12, guideW, this.blockHeight + 24);

          ctx.strokeStyle = 'rgba(0, 242, 254, 0.45)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(guideX, this.movingBlock.y, guideW, this.blockHeight);
        }
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha = this.movingBlock.opacity;
      this.renderBlock(ctx, this.movingBlock, true, this.stack.length, true);

      if (this.flowMode) {
        ctx.fillStyle = `hsla(${this.movingBlock.hue}, 100%, 75%, 0.3)`;
        const trailWidth = 50;
        const trailX = this.movingBlock.direction === 1
          ? this.movingBlock.x - trailWidth
          : this.movingBlock.x + this.movingBlock.width;
        ctx.fillRect(trailX, this.movingBlock.y, trailWidth, this.movingBlock.height);
      }

      ctx.restore();
    }

    if (this.particles.length > 0) {
      ctx.save();
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (this.ambientParticles.length > 0) {
      ctx.save();
      for (let i = 0; i < this.ambientParticles.length; i++) {
        const ap = this.ambientParticles[i];
        ctx.globalAlpha = Math.max(0, ap.alpha);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ap.x, ap.y, ap.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (this.floatingTexts.length > 0) {
      ctx.save();
      ctx.font = '900 20px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      for (let i = 0; i < this.floatingTexts.length; i++) {
        const ft = this.floatingTexts[i];
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.restore();
    }

    ctx.restore();

    if (this.flowMode) {
      ctx.save();
      const hue = (this.visualTime * 100) % 360;
      ctx.strokeStyle = `hsla(${hue}, 100%, 65%, 0.35)`;
      ctx.lineWidth = 10;
      ctx.strokeRect(0, 0, physicalWidth * dpr, physicalHeight * dpr);
      ctx.restore();
    }
  }

  renderBlock(ctx, b, isMoving = false, stackIndex = 0, isTopBlock = false) {
    const { x, y, width, height, hue, isPerfect } = b;

    ctx.save();

    const mainColor = `hsl(${hue}, 85%, 55%)`;
    const topHighlight = `hsl(${hue}, 90%, 75%)`;
    const bottomShadow = `hsl(${hue}, 80%, 35%)`;

    ctx.fillStyle = mainColor;
    if (isPerfect) {
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 20;
    } else if (isMoving) {
      ctx.shadowColor = mainColor;
      ctx.shadowBlur = 12;
    } else if (isTopBlock) {
      ctx.shadowColor = mainColor;
      ctx.shadowBlur = 8;
    }

    const radius = Math.min(5, height / 2);
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();

    ctx.fillStyle = topHighlight;
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, width - 4, Math.max(3, height * 0.25), Math.max(1, radius - 1));
    ctx.fill();

    ctx.fillStyle = bottomShadow;
    ctx.beginPath();
    ctx.roundRect(x + 2, y + height - Math.max(3, height * 0.25), width - 4, Math.max(3, height * 0.25), Math.max(1, radius - 1));
    ctx.fill();

    if (stackIndex >= 10 && !isMoving) {
      ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.4)`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, width, height);
    }

    if (isPerfect) {
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x - 1, y - 1, width + 2, height + 2);
    }

    ctx.restore();
  }

  renderBackgroundGrid(ctx, visibleLogicalHeight) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;

    const gridSize = 60;
    const startY = Math.floor(-this.cameraY / gridSize) * gridSize - gridSize;
    const endY = startY + (visibleLogicalHeight || 600) + gridSize * 2;

    ctx.beginPath();
    for (let y = startY; y < endY; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(LOGICAL_WIDTH, y);
    }
    ctx.stroke();

    ctx.restore();
  }
}
