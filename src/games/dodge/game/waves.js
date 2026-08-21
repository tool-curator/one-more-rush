import { Enemy, getSafeSpawnPos } from './enemies.js';

export class WaveDirector {
  constructor(arenaWidth = 1200, arenaHeight = 800) {
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;


    this.survivalTime = 0; // Total seconds survived
    this.dangerLevel = 1;
    this.previousDangerLevel = 1;

    this.toastTimer = 0;
    this.toastText = 'DANGER LEVEL 1 — WARMUP';

    // Arena boundary inset (for arena shrink mechanic)
    this.inset = 0;
    this.targetInset = 0;
    this.shrinkWarningTimer = 0;
    this.hasWarnedShrink = false;

    // Enemy spawn wave control
    this.spawnTimer = 0;
    
    // Danger Events system
    this.eventCooldown = 22.0; // Seconds between events
    this.activeEvent = null; // { id, name, timer, duration }
  }

  reset() {
    this.survivalTime = 0;
    this.dangerLevel = 1;
    this.previousDangerLevel = 1;
    this.toastTimer = 2.5;
    this.toastText = 'DANGER 1 — WARMUP';
    this.inset = 0;
    this.targetInset = 0;
    this.shrinkWarningTimer = 0;
    this.hasWarnedShrink = false;
    this.spawnTimer = 0;
    this.eventCooldown = 25.0;
    this.activeEvent = null;
  }

  getBounds() {
    return {
      left: this.inset,
      top: this.inset,
      right: Math.max(this.inset + 340, this.arenaWidth - this.inset),
      bottom: Math.max(this.inset + 260, this.arenaHeight - this.inset),
    };
  }


  update(dt, player, enemies, collectibles, createScoreCollectible) {
    this.survivalTime += dt;

    // Calculate current Danger Level based on time milestones
    const time = this.survivalTime;
    let newLevel = 1;
    if (time < 10) newLevel = 1;
    else if (time < 30) newLevel = 2;
    else if (time < 60) newLevel = 3;
    else if (time < 90) newLevel = 4;
    else if (time < 120) newLevel = 5;
    else newLevel = 6 + Math.floor((time - 120) / 30);

    if (newLevel !== this.dangerLevel) {
      this.previousDangerLevel = this.dangerLevel;
      this.dangerLevel = newLevel;
      this.toastTimer = 2.5;
      
      const levelTitles = {
        1: 'DANGER 1 — WARMUP',
        2: 'DANGER 2 — PRESSURE',
        3: 'DANGER 3 — CHASERS',
        4: 'DANGER 4 — MULTIPLE THREATS',
        5: 'DANGER 5 — PROJECTILE PHASE',
      };
      this.toastText = levelTitles[this.dangerLevel] || `DANGER ${this.dangerLevel} — CHAOS!`;
      
      // Update wave enemies on level transition
      this.populateWaveEnemies(player, enemies);
    }

    // Decrement toast timer
    if (this.toastTimer > 0) {
      this.toastTimer = Math.max(0, this.toastTimer - dt);
    }
    if (this.shrinkWarningTimer > 0) {
      this.shrinkWarningTimer = Math.max(0, this.shrinkWarningTimer - dt);
    }

    // Arena shrinking behavior (Level 4+)
    if (this.dangerLevel >= 4) {
      if (!this.hasWarnedShrink && time >= 58 && time < 60) {
        this.hasWarnedShrink = true;
        this.shrinkWarningTimer = 2.5;
        this.toastText = '⚠️ ARENA SHRINKING';
      }

      // Max inset calculation (keeping minimum 360x280 playable space)
      const maxPossibleInset = Math.min(
        (this.arenaWidth - 360) / 2,
        (this.arenaHeight - 280) / 2,
        110
      );

      if (this.dangerLevel === 4) {
        this.targetInset = Math.min(45, maxPossibleInset);
      } else if (this.dangerLevel === 5) {
        this.targetInset = Math.min(75, maxPossibleInset);
      } else {
        const extra = (this.dangerLevel - 5) * 12;
        this.targetInset = Math.min(maxPossibleInset, 75 + extra);
      }
    }

    // Smooth boundary inset interpolation
    if (Math.abs(this.inset - this.targetInset) > 0.1) {
      this.inset += (this.targetInset - this.inset) * Math.min(1, dt * 1.2);
    }

    // Periodic dynamic spawner for active level scaling
    this.spawnTimer += dt;
    const spawnInterval = Math.max(4.0, 10.0 - this.dangerLevel * 0.8);
    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      this.maintainEnemyCounts(player, enemies);
    }

    // Danger Events Update
    if (this.activeEvent) {
      this.activeEvent.timer -= dt;
      if (this.activeEvent.timer <= 0) {
        this.activeEvent = null;
      }
    } else if (time > 15) {
      this.eventCooldown -= dt;
      if (this.eventCooldown <= 0) {
        this.triggerRandomEvent(enemies, player, collectibles, createScoreCollectible);
        this.eventCooldown = 28.0 + Math.random() * 14.0;
      }
    }
  }


  triggerRandomEvent(enemies, player, collectibles, createScoreCollectible) {
    const events = [
      { id: 'DOUBLE_SCORE', name: '⚡ DOUBLE SCORE (10s)', duration: 10.0 },
      { id: 'HAZARD_RUSH', name: '⚠️ HAZARD RUSH! (8s)', duration: 8.0 },
      { id: 'TARGET_RAIN', name: '✨ TARGET RAIN! (6s)', duration: 6.0 },
      { id: 'BLACKOUT', name: '🌙 BLACKOUT (8s)', duration: 8.0 },
    ];
    
    // Pick event
    const event = events[Math.floor(Math.random() * events.length)];
    this.activeEvent = {
      id: event.id,
      name: event.name,
      timer: event.duration,
      duration: event.duration,
    };
    
    this.toastTimer = 2.2;
    this.toastText = event.name;

    const bounds = this.getBounds();

    // Special event side-effects
    if (event.id === 'HAZARD_RUSH') {
      for (let i = 0; i < 2; i++) {
        const pos = getSafeSpawnPos(bounds, player, 140);
        const angle = Math.random() * Math.PI * 2;
        enemies.push(
          new Enemy('BOUNCER', pos.x, pos.y, {
            vx: Math.cos(angle) * 195,
            vy: Math.sin(angle) * 195,
          })
        );
      }
    } else if (event.id === 'TARGET_RAIN' && collectibles && createScoreCollectible) {
      // Spawn 4 extra targets across the map immediately
      for (let i = 0; i < 4; i++) {
        collectibles.push(createScoreCollectible(bounds, player, this.dangerLevel));
      }
    }
  }


  maintainEnemyCounts(player, enemies) {
    const bounds = this.getBounds();
    const lvl = this.dangerLevel;

    // Ensure we don't have too few or too many hazards
    let maxEnemies = 2;
    if (lvl === 2) maxEnemies = 4;
    else if (lvl === 3) maxEnemies = 5;
    else if (lvl === 4) maxEnemies = 7;
    else if (lvl === 5) maxEnemies = 9;
    else maxEnemies = Math.min(13, 9 + (lvl - 5));

    if (enemies.length < maxEnemies) {
      const needed = maxEnemies - enemies.length;
      for (let i = 0; i < needed; i++) {
        const pos = getSafeSpawnPos(bounds, player, 140);
        if (lvl >= 3 && Math.random() < 0.45) {
          const speed = Math.min(185, 115 + lvl * 10);
          enemies.push(new Enemy('CHASER', pos.x, pos.y, { speed }));
        } else if (lvl >= 5 && Math.random() < 0.35) {
          enemies.push(new Enemy('SHOOTER', pos.x, pos.y));
        } else {
          const angle = Math.random() * Math.PI * 2;
          const spd = 140 + lvl * 12;
          enemies.push(
            new Enemy('BOUNCER', pos.x, pos.y, {
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
            })
          );
        }
      }
    }
  }

  populateWaveEnemies(player, enemies) {
    enemies.length = 0; // Clear existing
    const bounds = this.getBounds();
    const lvl = this.dangerLevel;

    if (lvl === 1) {
      // Level 1 — Warmup: 1-2 slow bouncers / static mines
      for (let i = 0; i < 2; i++) {
        const pos = getSafeSpawnPos(bounds, player, 160);
        enemies.push(new Enemy('STATIC', pos.x, pos.y));
      }
    } else if (lvl === 2) {
      // Level 2 — Pressure: 3-4 slightly faster enemies, moving hazards
      for (let i = 0; i < 2; i++) {
        const pos = getSafeSpawnPos(bounds, player, 150);
        enemies.push(new Enemy('STATIC', pos.x, pos.y));
      }
      for (let i = 0; i < 2; i++) {
        const pos = getSafeSpawnPos(bounds, player, 150);
        const angle = Math.random() * Math.PI * 2;
        enemies.push(
          new Enemy('BOUNCER', pos.x, pos.y, {
            vx: Math.cos(angle) * 150,
            vy: Math.sin(angle) * 150,
          })
        );
      }
    } else if (lvl === 3) {
      // Level 3 — Chasers: Introduce 1-2 slow, dodgeable chasers
      for (let i = 0; i < 2; i++) {
        const pos = getSafeSpawnPos(bounds, player, 150);
        const angle = Math.random() * Math.PI * 2;
        enemies.push(
          new Enemy('BOUNCER', pos.x, pos.y, {
            vx: Math.cos(angle) * 170,
            vy: Math.sin(angle) * 170,
          })
        );
      }
      for (let i = 0; i < 2; i++) {
        const pos = getSafeSpawnPos(bounds, player, 160);
        enemies.push(new Enemy('CHASER', pos.x, pos.y, { speed: 125 }));
      }
    } else if (lvl === 4) {
      // Level 4 — Multiple Threats: Bouncers + Chasers + Static Mines + Shrinking
      for (let i = 0; i < 2; i++) {
        const pos = getSafeSpawnPos(bounds, player, 150);
        enemies.push(new Enemy('STATIC', pos.x, pos.y));
      }
      for (let i = 0; i < 2; i++) {
        const pos = getSafeSpawnPos(bounds, player, 150);
        const angle = Math.random() * Math.PI * 2;
        enemies.push(
          new Enemy('BOUNCER', pos.x, pos.y, {
            vx: Math.cos(angle) * 185,
            vy: Math.sin(angle) * 185,
          })
        );
      }
      for (let i = 0; i < 2; i++) {
        const pos = getSafeSpawnPos(bounds, player, 150);
        enemies.push(new Enemy('CHASER', pos.x, pos.y, { speed: 140 }));
      }
    } else if (lvl === 5) {
      // Level 5 — Projectile Phase: Introduce Projectile Shooters
      for (let i = 0; i < 3; i++) {
        const pos = getSafeSpawnPos(bounds, player, 150);
        const angle = Math.random() * Math.PI * 2;
        enemies.push(
          new Enemy('BOUNCER', pos.x, pos.y, {
            vx: Math.cos(angle) * 200,
            vy: Math.sin(angle) * 200,
          })
        );
      }
      for (let i = 0; i < 2; i++) {
        const pos = getSafeSpawnPos(bounds, player, 150);
        enemies.push(new Enemy('CHASER', pos.x, pos.y, { speed: 150 }));
      }
      for (let i = 0; i < 2; i++) {
        const pos = getSafeSpawnPos(bounds, player, 150);
        enemies.push(new Enemy('SHOOTER', pos.x, pos.y));
      }
    } else {
      // Level 6+ — Chaos: Scaled combination of all hazards
      const bouncers = Math.min(5, 3 + Math.floor((lvl - 5) / 2));
      const chasers = Math.min(4, 2 + Math.floor((lvl - 5) / 2));
      const shooters = Math.min(3, 2 + Math.floor((lvl - 5) / 3));

      for (let i = 0; i < bouncers; i++) {
        const pos = getSafeSpawnPos(bounds, player, 140);
        const angle = Math.random() * Math.PI * 2;
        const spd = 200 + (lvl - 5) * 10;
        enemies.push(
          new Enemy('BOUNCER', pos.x, pos.y, {
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
          })
        );
      }
      for (let i = 0; i < chasers; i++) {
        const pos = getSafeSpawnPos(bounds, player, 140);
        enemies.push(new Enemy('CHASER', pos.x, pos.y, { speed: 145 + (lvl - 5) * 6 }));
      }
      for (let i = 0; i < shooters; i++) {
        const pos = getSafeSpawnPos(bounds, player, 140);
        enemies.push(new Enemy('SHOOTER', pos.x, pos.y));
      }
    }
  }
}

