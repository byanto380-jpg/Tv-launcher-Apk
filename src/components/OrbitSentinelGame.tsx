import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
type Difficulty = 'chill' | 'standard' | 'veteran';

interface OrbitSentinelGameProps {
  isOpen: boolean;
  initialMuted?: boolean;
  onExit: () => void;
}

interface Bullet {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fromEnemy: boolean;
  radius: number;
}

type EnemyKind = 'scout' | 'charger' | 'striker';

interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  hitFlash: number;
  squashX: number;
  squashY: number;
  phaseTimer: number;
  state: 'approach' | 'windup' | 'attack';
  targetX: number;
  targetY: number;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface Pickup {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  kind: 'shield' | 'overdrive';
}

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  alpha: number;
}

interface HudSnapshot {
  score: number;
  bestScore: number;
  wave: number;
  shield: number;
  maxShield: number;
  combo: number;
  overdriveSec: number;
  dashReady: boolean;
}

const BACKDROP_URL = '/src/assets/images/game_arcade_backdrop_1795581572334.jpg';
const HIGH_SCORE_STORAGE_KEY = 'tvl_orbit_sentinel_best';

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { label: string; enemySpeedMul: number; spawnRateMul: number; startShield: number }
> = {
  chill: { label: 'Santai', enemySpeedMul: 0.82, spawnRateMul: 0.85, startShield: 4 },
  standard: { label: 'Standar', enemySpeedMul: 1.0, spawnRateMul: 1.0, startShield: 3 },
  veteran: { label: 'Veteran', enemySpeedMul: 1.24, spawnRateMul: 1.22, startShield: 2 },
};

function readBestScore(): number {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score: number): void {
  try {
    localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(Math.floor(score)));
  } catch {
    // ignore storage quota errors
  }
}

export const OrbitSentinelGame: React.FC<OrbitSentinelGameProps> = ({
  isOpen,
  initialMuted = false,
  onExit,
}) => {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [difficulty, setDifficulty] = useState<Difficulty>('standard');
  const [muted, setMuted] = useState<boolean>(initialMuted);
  const [backdropFailed, setBackdropFailed] = useState(false);
  const [hud, setHud] = useState<HudSnapshot>(() => ({
    score: 0,
    bestScore: readBestScore(),
    wave: 1,
    shield: 3,
    maxShield: 3,
    combo: 1,
    overdriveSec: 0,
    dashReady: true,
  }));

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;
  const difficultyRef = useRef<Difficulty>(difficulty);
  difficultyRef.current = difficulty;
  const mutedRef = useRef<boolean>(muted);
  mutedRef.current = muted;
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSfx = useCallback(
    (kind: 'laser' | 'hit' | 'explode' | 'dash' | 'damage' | 'pickup' | 'wave') => {
      if (mutedRef.current) return;
      try {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = new Ctx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (kind === 'laser') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(760, now);
          osc.frequency.exponentialRampToValueAtTime(280, now + 0.08);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.085);
        } else if (kind === 'hit') {
          osc.type = 'square';
          osc.frequency.setValueAtTime(240, now);
          osc.frequency.exponentialRampToValueAtTime(110, now + 0.06);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
          osc.start(now);
          osc.stop(now + 0.065);
        } else if (kind === 'explode') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(190, now);
          osc.frequency.exponentialRampToValueAtTime(48, now + 0.18);
          gain.gain.setValueAtTime(0.11, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
          osc.start(now);
          osc.stop(now + 0.2);
        } else if (kind === 'dash') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(840, now + 0.11);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.125);
        } else if (kind === 'damage') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.linearRampToValueAtTime(55, now + 0.25);
          gain.gain.setValueAtTime(0.14, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
          osc.start(now);
          osc.stop(now + 0.27);
        } else if (kind === 'pickup') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(520, now);
          osc.frequency.setValueAtTime(780, now + 0.07);
          gain.gain.setValueAtTime(0.09, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          osc.start(now);
          osc.stop(now + 0.19);
        } else if (kind === 'wave') {
          [440, 554, 659].forEach((freq, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.frequency.value = freq;
            g.gain.setValueAtTime(0.07, now + i * 0.07);
            g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.18);
            o.connect(g);
            g.connect(ctx.destination);
            o.start(now + i * 0.07);
            o.stop(now + i * 0.07 + 0.2);
          });
        }
      } catch {
        // ignore audio errors
      }
    },
    []
  );

  // Simulation mutable engine ref (isolated from React re-renders)
  const simRef = useRef<{
    width: number;
    height: number;
    playerX: number;
    playerY: number;
    playerVx: number;
    playerVy: number;
    playerSquashX: number;
    playerSquashY: number;
    playerFlash: number;
    invulnTimer: number;
    fireCooldown: number;
    dashCooldown: number;
    dashBufferTimer: number;
    dashActiveTimer: number;
    dashDirX: number;
    dashDirY: number;
    score: number;
    bestScore: number;
    wave: number;
    waveKills: number;
    waveQuota: number;
    shield: number;
    maxShield: number;
    combo: number;
    comboTimer: number;
    overdriveTimer: number;
    spawnTimer: number;
    hitstopTimer: number;
    shakeMag: number;
    nextEnemyId: number;
    enemies: Enemy[];
    bullets: Bullet[];
    particles: Particle[];
    pickups: Pickup[];
    stars: Star[];
    held: Set<string>;
    justPressed: Set<string>;
  } | null>(null);

  const resetSimulation = useCallback((diff: Difficulty) => {
    const cfg = DIFFICULTY_CONFIG[diff];
    const best = readBestScore();
    const w = window.innerWidth || 1280;
    const h = window.innerHeight || 720;

    const bullets: Bullet[] = Array.from({ length: 140 }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      fromEnemy: false,
      radius: 4,
    }));

    const particles: Particle[] = Array.from({ length: 180 }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 2,
      color: '#fbbf24',
    }));

    const pickups: Pickup[] = Array.from({ length: 8 }, () => ({
      active: false,
      x: 0,
      y: 0,
      vy: 90,
      kind: 'shield',
    }));

    const stars: Star[] = Array.from({ length: 72 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      speed: 22 + Math.random() * 68,
      size: 1 + Math.random() * 1.8,
      alpha: 0.25 + Math.random() * 0.6,
    }));

    simRef.current = {
      width: w,
      height: h,
      playerX: w * 0.5,
      playerY: h * 0.78,
      playerVx: 0,
      playerVy: 0,
      playerSquashX: 1,
      playerSquashY: 1,
      playerFlash: 0,
      invulnTimer: 0,
      fireCooldown: 0,
      dashCooldown: 0,
      dashBufferTimer: 0,
      dashActiveTimer: 0,
      dashDirX: 0,
      dashDirY: 0,
      score: 0,
      bestScore: best,
      wave: 1,
      waveKills: 0,
      waveQuota: 8,
      shield: cfg.startShield,
      maxShield: cfg.startShield,
      combo: 1,
      comboTimer: 0,
      overdriveTimer: 0,
      spawnTimer: 0.4,
      hitstopTimer: 0,
      shakeMag: 0,
      nextEnemyId: 1,
      enemies: [],
      bullets,
      particles,
      pickups,
      stars,
      held: new Set(),
      justPressed: new Set(),
    };

    setHud({
      score: 0,
      bestScore: best,
      wave: 1,
      shield: cfg.startShield,
      maxShield: cfg.startShield,
      combo: 1,
      overdriveSec: 0,
      dashReady: true,
    });
  }, []);

  const startGame = useCallback(() => {
    resetSimulation(difficultyRef.current);
    setGameState('PLAYING');
    playSfx('wave');
  }, [resetSimulation, playSfx]);

  // Reset to title screen when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setGameState('TITLE_MENU');
    resetSimulation(difficultyRef.current);
  }, [isOpen, resetSimulation]);

  // Global keyboard handler (supports TV Remote D-pad + Keyboard WASD/Arrows)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const state = gameStateRef.current;

      if (state === 'TITLE_MENU') {
        if (code === 'Enter' || code === 'Space') {
          e.preventDefault();
          startGame();
        } else if (code === 'Escape' || code === 'BrowserBack') {
          e.preventDefault();
          onExit();
        }
        return;
      }

      if (state === 'PAUSED') {
        if (code === 'Escape' || code === 'KeyP' || code === 'Enter' || code === 'Space') {
          e.preventDefault();
          setGameState('PLAYING');
        } else if (code === 'KeyQ') {
          e.preventDefault();
          setGameState('TITLE_MENU');
        }
        return;
      }

      if (state === 'GAME_OVER') {
        if (code === 'Enter' || code === 'Space' || code === 'KeyR') {
          e.preventDefault();
          startGame();
        } else if (code === 'Escape' || code === 'BrowserBack') {
          e.preventDefault();
          setGameState('TITLE_MENU');
        }
        return;
      }

      // PLAYING state
      if (code === 'Escape' || code === 'KeyP' || code === 'BrowserBack') {
        e.preventDefault();
        simRef.current?.held.clear();
        setGameState('PAUSED');
        return;
      }

      if (code === 'KeyM') {
        e.preventDefault();
        setMuted((prev) => !prev);
        return;
      }

      if (
        [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Space',
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
          'ShiftLeft',
          'ShiftRight',
          'KeyB',
          'Enter',
        ].includes(code)
      ) {
        e.preventDefault();
      }

      const sim = simRef.current;
      if (!sim) return;
      if (!sim.held.has(code)) {
        sim.justPressed.add(code);
      }
      sim.held.add(code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      simRef.current?.held.delete(e.code);
    };

    const handleBlur = () => {
      simRef.current?.held.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isOpen, onExit, startGame]);

  // Isolated 60fps Canvas Loop
  useEffect(() => {
    if (!isOpen) return;

    let rafId = 0;
    let lastTime = performance.now();
    let hudSyncAccum = 0;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    const resizeCanvas = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      if (simRef.current) {
        simRef.current.width = w;
        simRef.current.height = h;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const spawnBullet = (
      x: number,
      y: number,
      vx: number,
      vy: number,
      fromEnemy: boolean,
      radius = 4
    ) => {
      const sim = simRef.current;
      if (!sim) return;
      for (const b of sim.bullets) {
        if (!b.active) {
          b.active = true;
          b.x = x;
          b.y = y;
          b.vx = vx;
          b.vy = vy;
          b.fromEnemy = fromEnemy;
          b.radius = radius;
          return;
        }
      }
    };

    const emitParticles = (
      x: number,
      y: number,
      count: number,
      color: string,
      speedMin = 40,
      speedMax = 220,
      size = 3
    ) => {
      const sim = simRef.current;
      if (!sim) return;
      let spawned = 0;
      for (const p of sim.particles) {
        if (!p.active) {
          const angle = Math.random() * Math.PI * 2;
          const speed = speedMin + Math.random() * (speedMax - speedMin);
          p.active = true;
          p.x = x;
          p.y = y;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed;
          p.maxLife = 0.25 + Math.random() * 0.35;
          p.life = p.maxLife;
          p.size = size * (0.7 + Math.random() * 0.7);
          p.color = color;
          spawned++;
          if (spawned >= count) break;
        }
      }
    };

    const spawnEnemy = () => {
      const sim = simRef.current;
      if (!sim) return;
      const cfg = DIFFICULTY_CONFIG[difficultyRef.current];
      const waveBoost = 1 + (sim.wave - 1) * 0.08;
      const roll = Math.random();
      let kind: EnemyKind = 'scout';
      if (sim.wave >= 2 && roll > 0.74) {
        kind = 'striker';
      } else if (roll > 0.48) {
        kind = 'charger';
      }

      const margin = 64;
      const x = margin + Math.random() * Math.max(120, sim.width - margin * 2);
      const hp =
        kind === 'scout'
          ? 1
          : kind === 'charger'
          ? 2 + Math.floor(sim.wave / 4)
          : 3 + Math.floor(sim.wave / 3);

      sim.enemies.push({
        id: sim.nextEnemyId++,
        kind,
        x,
        y: -34,
        vx: (Math.random() - 0.5) * 90 * cfg.enemySpeedMul,
        vy: (kind === 'scout' ? 125 : 85) * cfg.enemySpeedMul * waveBoost,
        radius: kind === 'scout' ? 16 : kind === 'charger' ? 21 : 23,
        hp,
        maxHp: hp,
        hitFlash: 0,
        squashX: 1.25,
        squashY: 0.75,
        phaseTimer: 0.9 + Math.random() * 0.9,
        state: 'approach',
        targetX: sim.playerX,
        targetY: sim.playerY,
      });
    };

    const spawnPickup = (x: number, y: number) => {
      const sim = simRef.current;
      if (!sim) return;
      for (const p of sim.pickups) {
        if (!p.active) {
          p.active = true;
          p.x = x;
          p.y = y;
          p.vy = 95;
          p.kind = Math.random() < 0.45 ? 'shield' : 'overdrive';
          return;
        }
      }
    };

    const syncHudNow = () => {
      const sim = simRef.current;
      if (!sim) return;
      setHud({
        score: sim.score,
        bestScore: sim.bestScore,
        wave: sim.wave,
        shield: sim.shield,
        maxShield: sim.maxShield,
        combo: sim.combo,
        overdriveSec: Math.ceil(sim.overdriveTimer),
        dashReady: sim.dashCooldown <= 0,
      });
    };

    const stepSimulation = (dt: number) => {
      const sim = simRef.current;
      if (!sim) return;

      // Always animate stars smoothly
      for (const star of sim.stars) {
        star.y += star.speed * dt;
        if (star.y > sim.height) {
          star.y = -4;
          star.x = Math.random() * sim.width;
        }
      }

      if (gameStateRef.current !== 'PLAYING') {
        sim.justPressed.clear();
        return;
      }

      // Hitstop freeze for heavy impacts
      if (sim.hitstopTimer > 0) {
        sim.hitstopTimer = Math.max(0, sim.hitstopTimer - dt);
        sim.shakeMag = Math.max(0, sim.shakeMag - dt * 28);
        sim.justPressed.clear();
        return;
      }

      const cfg = DIFFICULTY_CONFIG[difficultyRef.current];

      // Timers
      sim.invulnTimer = Math.max(0, sim.invulnTimer - dt);
      sim.playerFlash = Math.max(0, sim.playerFlash - dt);
      sim.fireCooldown = Math.max(0, sim.fireCooldown - dt);
      sim.dashCooldown = Math.max(0, sim.dashCooldown - dt);
      sim.dashBufferTimer = Math.max(0, sim.dashBufferTimer - dt);
      sim.overdriveTimer = Math.max(0, sim.overdriveTimer - dt);
      sim.shakeMag = Math.max(0, sim.shakeMag - dt * 26);

      if (sim.comboTimer > 0) {
        sim.comboTimer -= dt;
        if (sim.comboTimer <= 0) {
          sim.combo = 1;
        }
      }

      // Continuous movement input
      let moveX = 0;
      let moveY = 0;
      if (sim.held.has('ArrowLeft') || sim.held.has('KeyA')) moveX -= 1;
      if (sim.held.has('ArrowRight') || sim.held.has('KeyD')) moveX += 1;
      if (sim.held.has('ArrowUp') || sim.held.has('KeyW')) moveY -= 1;
      if (sim.held.has('ArrowDown') || sim.held.has('KeyS')) moveY += 1;

      if (moveX !== 0 && moveY !== 0) {
        const inv = 1 / Math.SQRT2;
        moveX *= inv;
        moveY *= inv;
      }

      // Edge-triggered dash with 120ms input buffer
      if (
        sim.justPressed.has('ShiftLeft') ||
        sim.justPressed.has('ShiftRight') ||
        sim.justPressed.has('KeyB')
      ) {
        sim.dashBufferTimer = 0.12;
      }

      if (sim.dashBufferTimer > 0 && sim.dashCooldown <= 0 && sim.dashActiveTimer <= 0) {
        sim.dashBufferTimer = 0;
        sim.dashCooldown = 1.45;
        sim.dashActiveTimer = 0.16;
        sim.invulnTimer = Math.max(sim.invulnTimer, 0.22);
        sim.dashDirX = moveX !== 0 || moveY !== 0 ? moveX : 0;
        sim.dashDirY = moveX !== 0 || moveY !== 0 ? moveY : -1;
        sim.playerSquashX = 0.72;
        sim.playerSquashY = 1.35;
        playSfx('dash');
        emitParticles(sim.playerX, sim.playerY, 14, '#38bdf8', 60, 210, 3);
      }

      if (sim.dashActiveTimer > 0) {
        sim.dashActiveTimer -= dt;
        sim.playerVx = sim.dashDirX * 860;
        sim.playerVy = sim.dashDirY * 860;
        emitParticles(sim.playerX, sim.playerY + 14, 2, '#7dd3fc', 20, 70, 2.5);
      } else {
        const speed = 390;
        const targetVx = moveX * speed;
        const targetVy = moveY * speed;
        const accel = Math.min(1, dt * 16);
        sim.playerVx += (targetVx - sim.playerVx) * accel;
        sim.playerVy += (targetVy - sim.playerVy) * accel;
      }

      sim.playerX = Math.max(28, Math.min(sim.width - 28, sim.playerX + sim.playerVx * dt));
      sim.playerY = Math.max(72, Math.min(sim.height - 40, sim.playerY + sim.playerVy * dt));
      sim.playerSquashX += (1 - sim.playerSquashX) * Math.min(1, dt * 14);
      sim.playerSquashY += (1 - sim.playerSquashY) * Math.min(1, dt * 14);

      // Firing (continuous hold or edge press on Space / Enter)
      const wantsFire =
        sim.held.has('Space') ||
        sim.held.has('Enter') ||
        sim.justPressed.has('Space') ||
        sim.justPressed.has('Enter');

      if (wantsFire && sim.fireCooldown <= 0) {
        const isOverdrive = sim.overdriveTimer > 0;
        sim.fireCooldown = isOverdrive ? 0.095 : 0.145;
        sim.playerSquashX = 1.12;
        sim.playerSquashY = 0.88;
        if (isOverdrive) {
          spawnBullet(sim.playerX - 11, sim.playerY - 18, -55, -720, false, 4.5);
          spawnBullet(sim.playerX, sim.playerY - 22, 0, -760, false, 4.5);
          spawnBullet(sim.playerX + 11, sim.playerY - 18, 55, -720, false, 4.5);
        } else {
          spawnBullet(sim.playerX - 8, sim.playerY - 18, 0, -720, false, 4);
          spawnBullet(sim.playerX + 8, sim.playerY - 18, 0, -720, false, 4);
        }
        playSfx('laser');
      }

      // Enemy spawner
      sim.spawnTimer -= dt;
      if (sim.spawnTimer <= 0 && sim.enemies.length < 18) {
        spawnEnemy();
        const interval = Math.max(0.42, (1.35 - sim.wave * 0.07) / cfg.spawnRateMul);
        sim.spawnTimer = interval;
      }

      // Update bullets
      for (const b of sim.bullets) {
        if (!b.active) continue;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x < -30 || b.x > sim.width + 30 || b.y < -30 || b.y > sim.height + 30) {
          b.active = false;
        }
      }

      // Update enemies & telegraphs
      for (let i = sim.enemies.length - 1; i >= 0; i--) {
        const e = sim.enemies[i];
        e.hitFlash = Math.max(0, e.hitFlash - dt);
        e.squashX += (1 - e.squashX) * Math.min(1, dt * 12);
        e.squashY += (1 - e.squashY) * Math.min(1, dt * 12);

        if (e.kind === 'scout') {
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          if (e.x < 30 || e.x > sim.width - 30) e.vx *= -1;
        } else if (e.kind === 'charger') {
          if (e.state === 'approach') {
            e.y += e.vy * dt;
            e.phaseTimer -= dt;
            if (e.phaseTimer <= 0 && e.y > 70 && e.y < sim.height * 0.55) {
              e.state = 'windup';
              e.phaseTimer = 0.72;
              e.targetX = sim.playerX;
              e.targetY = sim.playerY;
              e.squashX = 1.25;
              e.squashY = 0.75;
            }
          } else if (e.state === 'windup') {
            e.phaseTimer -= dt;
            if (e.phaseTimer <= 0) {
              e.state = 'attack';
              const dx = e.targetX - e.x;
              const dy = Math.max(120, e.targetY - e.y);
              const dist = Math.hypot(dx, dy) || 1;
              const chargeSpeed = 480 * cfg.enemySpeedMul;
              e.vx = (dx / dist) * chargeSpeed;
              e.vy = (dy / dist) * chargeSpeed;
              e.squashX = 0.72;
              e.squashY = 1.35;
            }
          } else {
            e.x += e.vx * dt;
            e.y += e.vy * dt;
          }
        } else {
          // Striker
          if (e.state === 'approach') {
            e.y += e.vy * dt;
            e.x += Math.sin(e.y * 0.02 + e.id) * 65 * dt;
            e.phaseTimer -= dt;
            if (e.phaseTimer <= 0 && e.y > 80 && e.y < sim.height * 0.5) {
              e.state = 'windup';
              e.phaseTimer = 0.92;
              e.targetX = sim.playerX;
              e.targetY = sim.playerY;
            }
          } else if (e.state === 'windup') {
            e.phaseTimer -= dt;
            if (e.phaseTimer <= 0) {
              e.state = 'attack';
              e.phaseTimer = 1.5;
              const dx = sim.playerX - e.x;
              const dy = sim.playerY - e.y;
              const dist = Math.hypot(dx, dy) || 1;
              const projSpeed = 290 * cfg.enemySpeedMul;
              spawnBullet(
                e.x,
                e.y + 12,
                (dx / dist) * projSpeed,
                (dy / dist) * projSpeed,
                true,
                6
              );
              e.squashX = 1.3;
              e.squashY = 0.72;
            }
          } else {
            e.y += e.vy * 0.55 * dt;
            e.phaseTimer -= dt;
            if (e.phaseTimer <= 0) {
              e.state = 'windup';
              e.phaseTimer = 0.95;
            }
          }
        }

        if (e.y > sim.height + 50) {
          sim.enemies.splice(i, 1);
          continue;
        }

        // Player bullet collisions
        let destroyed = false;
        for (const b of sim.bullets) {
          if (!b.active || b.fromEnemy) continue;
          const dist = Math.hypot(b.x - e.x, b.y - e.y);
          if (dist < e.radius + b.radius) {
            b.active = false;
            e.hp -= 1;
            e.hitFlash = 0.11;
            e.squashX = 1.24;
            e.squashY = 0.78;
            emitParticles(b.x, b.y, 5, '#fef08a', 50, 160, 2.2);

            if (e.hp <= 0) {
              destroyed = true;
              const pts =
                (e.kind === 'scout' ? 100 : e.kind === 'charger' ? 180 : 240) * sim.combo;
              sim.score += pts;
              if (sim.score > sim.bestScore) {
                sim.bestScore = sim.score;
                saveBestScore(sim.bestScore);
              }
              sim.combo = Math.min(8, sim.combo + 1);
              sim.comboTimer = 2.6;
              sim.waveKills += 1;

              const color =
                e.kind === 'scout' ? '#38bdf8' : e.kind === 'charger' ? '#fb923c' : '#f43f5e';
              emitParticles(e.x, e.y, e.kind === 'scout' ? 14 : 22, color, 65, 280, 3.4);

              if (e.kind !== 'scout') {
                sim.hitstopTimer = 0.042;
                sim.shakeMag = Math.max(sim.shakeMag, 7);
              } else {
                sim.shakeMag = Math.max(sim.shakeMag, 3);
              }

              playSfx('explode');

              if (Math.random() < 0.14) {
                spawnPickup(e.x, e.y);
              }

              if (sim.waveKills >= sim.waveQuota) {
                sim.wave += 1;
                sim.waveKills = 0;
                sim.waveQuota = Math.round(sim.waveQuota * 1.28 + 3);
                playSfx('wave');
              }

              sim.enemies.splice(i, 1);
              syncHudNow();
              break;
            } else {
              playSfx('hit');
            }
          }
        }

        if (destroyed) continue;

        // Player body collision
        if (sim.invulnTimer <= 0) {
          const playerDist = Math.hypot(e.x - sim.playerX, e.y - sim.playerY);
          if (playerDist < e.radius + 16) {
            sim.enemies.splice(i, 1);
            emitParticles(e.x, e.y, 18, '#f43f5e', 70, 260, 3.2);
            sim.shield -= 1;
            sim.combo = 1;
            sim.invulnTimer = 1.25;
            sim.playerFlash = 0.24;
            sim.hitstopTimer = 0.055;
            sim.shakeMag = 14;
            playSfx('damage');
            syncHudNow();

            if (sim.shield <= 0) {
              setGameState('GAME_OVER');
              return;
            }
          }
        }
      }

      // Enemy bullets vs player
      if (sim.invulnTimer <= 0) {
        for (const b of sim.bullets) {
          if (!b.active || !b.fromEnemy) continue;
          const d = Math.hypot(b.x - sim.playerX, b.y - sim.playerY);
          if (d < b.radius + 13) {
            b.active = false;
            emitParticles(sim.playerX, sim.playerY, 16, '#fb7185', 60, 240, 3);
            sim.shield -= 1;
            sim.combo = 1;
            sim.invulnTimer = 1.2;
            sim.playerFlash = 0.24;
            sim.hitstopTimer = 0.05;
            sim.shakeMag = 12;
            playSfx('damage');
            syncHudNow();

            if (sim.shield <= 0) {
              setGameState('GAME_OVER');
              return;
            }
          }
        }
      }

      // Pickups
      for (const p of sim.pickups) {
        if (!p.active) continue;
        p.y += p.vy * dt;
        if (p.y > sim.height + 30) {
          p.active = false;
          continue;
        }
        if (Math.hypot(p.x - sim.playerX, p.y - sim.playerY) < 30) {
          p.active = false;
          if (p.kind === 'shield') {
            sim.shield = Math.min(sim.maxShield, sim.shield + 1);
            emitParticles(p.x, p.y, 14, '#34d399', 50, 170, 3);
          } else {
            sim.overdriveTimer = 7.5;
            emitParticles(p.x, p.y, 14, '#fbbf24', 50, 170, 3);
          }
          playSfx('pickup');
          syncHudNow();
        }
      }

      // Particles
      for (const pt of sim.particles) {
        if (!pt.active) continue;
        pt.life -= dt;
        if (pt.life <= 0) {
          pt.active = false;
          continue;
        }
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vx *= 0.96;
        pt.vy *= 0.96;
      }

      sim.justPressed.clear();
    };

    const renderFrame = () => {
      if (!ctx || !simRef.current) return;
      const sim = simRef.current;

      ctx.save();
      ctx.fillStyle = '#070b14';
      ctx.fillRect(0, 0, sim.width, sim.height);

      // Subtle atmospheric orbital glow
      const bgGrad = ctx.createRadialGradient(
        sim.width * 0.78,
        sim.height * 0.2,
        20,
        sim.width * 0.78,
        sim.height * 0.2,
        sim.width * 0.65
      );
      bgGrad.addColorStop(0, 'rgba(245, 158, 11, 0.14)');
      bgGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.06)');
      bgGrad.addColorStop(1, 'rgba(7, 11, 20, 0)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, sim.width, sim.height);

      if (sim.shakeMag > 0.2) {
        const sx = (Math.random() - 0.5) * sim.shakeMag * 2;
        const sy = (Math.random() - 0.5) * sim.shakeMag * 2;
        ctx.translate(sx, sy);
      }

      // Stars
      for (const s of sim.stars) {
        ctx.fillStyle = `rgba(226, 232, 240, ${s.alpha})`;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }

      // Pickups
      for (const p of sim.pickups) {
        if (!p.active) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = p.kind === 'shield' ? '#10b981' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.kind === 'shield' ? '+' : '⚡', 0, 0.5);
        ctx.restore();
      }

      // Enemies + telegraphs
      for (const e of sim.enemies) {
        // Windup telegraph
        if (e.state === 'windup') {
          if (e.kind === 'charger') {
            ctx.save();
            ctx.strokeStyle = 'rgba(251, 146, 60, 0.65)';
            ctx.setLineDash([7, 7]);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            ctx.lineTo(e.targetX, e.targetY);
            ctx.stroke();
            ctx.restore();
          } else if (e.kind === 'striker') {
            ctx.save();
            const pulse = 1 + Math.sin(performance.now() * 0.02) * 0.16;
            ctx.strokeStyle = 'rgba(244, 63, 94, 0.85)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius * 1.45 * pulse, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }

        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.scale(e.squashX, e.squashY);

        if (e.hitFlash > 0) {
          ctx.fillStyle = '#ffffff';
        } else if (e.kind === 'scout') {
          ctx.fillStyle = '#38bdf8';
        } else if (e.kind === 'charger') {
          ctx.fillStyle = e.state === 'windup' ? '#fdba74' : '#f97316';
        } else {
          ctx.fillStyle = e.state === 'windup' ? '#fda4af' : '#e11d48';
        }

        ctx.beginPath();
        if (e.kind === 'scout') {
          ctx.moveTo(0, e.radius);
          ctx.lineTo(-e.radius, -e.radius * 0.7);
          ctx.lineTo(0, -e.radius * 0.3);
          ctx.lineTo(e.radius, -e.radius * 0.7);
          ctx.closePath();
        } else if (e.kind === 'charger') {
          ctx.moveTo(0, e.radius * 1.15);
          ctx.lineTo(-e.radius * 0.9, -e.radius * 0.4);
          ctx.lineTo(-e.radius * 0.35, -e.radius);
          ctx.lineTo(e.radius * 0.35, -e.radius);
          ctx.lineTo(e.radius * 0.9, -e.radius * 0.4);
          ctx.closePath();
        } else {
          for (let k = 0; k < 6; k++) {
            const a = (k * Math.PI) / 3;
            const px = Math.cos(a) * e.radius;
            const py = Math.sin(a) * e.radius;
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
        }
        ctx.fill();
        ctx.restore();
      }

      // Bullets
      for (const b of sim.bullets) {
        if (!b.active) continue;
        ctx.fillStyle = b.fromEnemy ? '#fb7185' : '#fef08a';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Player ship
      const blinkHide =
        sim.invulnTimer > 0 && Math.floor(sim.invulnTimer * 18) % 2 === 0 && sim.dashActiveTimer <= 0;
      if (!blinkHide) {
        ctx.save();
        ctx.translate(sim.playerX, sim.playerY);
        ctx.scale(sim.playerSquashX, sim.playerSquashY);

        // Thruster flame
        ctx.fillStyle = sim.overdriveTimer > 0 ? '#fbbf24' : '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(-6, 14);
        ctx.lineTo(0, 24 + Math.random() * 7);
        ctx.lineTo(6, 14);
        ctx.closePath();
        ctx.fill();

        // Hull
        ctx.fillStyle = sim.playerFlash > 0 ? '#ffffff' : '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.lineTo(18, 14);
        ctx.lineTo(6, 10);
        ctx.lineTo(0, 16);
        ctx.lineTo(-6, 10);
        ctx.lineTo(-18, 14);
        ctx.closePath();
        ctx.fill();

        // Cockpit accent
        ctx.fillStyle = sim.overdriveTimer > 0 ? '#f59e0b' : '#0ea5e9';
        ctx.beginPath();
        ctx.arc(0, -3, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Particles
      for (const pt of sim.particles) {
        if (!pt.active) continue;
        const alpha = Math.max(0, pt.life / pt.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.restore();
    };

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);

      stepSimulation(dt);
      renderFrame();

      hudSyncAccum += dt;
      if (hudSyncAccum >= 0.2) {
        hudSyncAccum = 0;
        if (gameStateRef.current === 'PLAYING') {
          syncHudNow();
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isOpen, playSfx]);

  if (!isOpen) return null;

  return (
    <div
      id="orbit-sentinel-shell"
      role="dialog"
      aria-modal="true"
      aria-label="Game Arcade Orbit Sentinel"
      className="fixed inset-0 z-[58] select-none overflow-hidden bg-[#070b14] text-slate-100"
    >
      {/* Isolated Canvas Viewport */}
      <canvas ref={canvasRef} className="block h-full w-full" />

      {/* TITLE SCREEN */}
      {gameState === 'TITLE_MENU' && (
        <div className="absolute inset-0 z-20 flex items-center bg-[#070b14]">
          {!backdropFailed ? (
            <img
              src={BACKDROP_URL}
              alt="Orbit Sentinel Key Art"
              referrerPolicy="no-referrer"
              onError={() => setBackdropFailed(true)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(circle_at_78%_30%,rgba(245,158,11,0.28),#0c182c_52%,#070b14_100%)]"
            />
          )}

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-[#070b14]/95 via-[#070b14]/78 to-[#070b14]/25"
          />

          <div className="relative z-10 flex max-w-2xl flex-col items-start gap-7 px-8 md:px-16">
            {/* Bespoke SVG Title Lockup */}
            <svg
              viewBox="0 0 540 124"
              className="w-full max-w-lg"
              aria-label="ORBIT SENTINEL"
            >
              <defs>
                <linearGradient id="osTitleGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f8fafc" />
                  <stop offset="68%" stopColor="#fde68a" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
              <path
                d="M12 62 C 12 28, 42 14, 72 28 M 12 62 C 12 96, 42 110, 72 96"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <polygon points="44,44 64,62 44,80 50,62" fill="#f59e0b" />
              <text
                x="92"
                y="58"
                fill="url(#osTitleGrad)"
                fontFamily="Plus Jakarta Sans, sans-serif"
                fontWeight="700"
                fontSize="44"
                letterSpacing="3"
              >
                ORBIT
              </text>
              <text
                x="92"
                y="102"
                fill="#e2e8f0"
                fontFamily="Plus Jakarta Sans, sans-serif"
                fontWeight="600"
                fontSize="36"
                letterSpacing="7"
              >
                SENTINEL
              </text>
            </svg>

            <div className="flex flex-wrap items-center gap-2">
              {(['chill', 'standard', 'veteran'] as Difficulty[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    difficulty === level
                      ? 'border-amber-400 bg-amber-400/20 text-amber-100'
                      : 'border-slate-700 bg-slate-900/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {DIFFICULTY_CONFIG[level].label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setMuted((prev) => !prev)}
                aria-label={muted ? 'Nyalakan suara game' : 'Bisukan suara game'}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                <span>{muted ? 'Senyap' : 'Suara'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                autoFocus
                onClick={startGame}
                className="rounded-xl bg-amber-400 px-8 py-3.5 text-base font-bold text-slate-950 transition-transform duration-150 hover:scale-[1.02] hover:bg-amber-300"
              >
                Start Game
              </button>

              <button
                type="button"
                onClick={onExit}
                className="rounded-xl border border-slate-600/80 bg-slate-900/80 px-5 py-3.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
              >
                Exit to Launcher
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
              <span>Panah / WASD Gerak · Spasi / OK Tembak · Shift / B Dash · P / Esc Jeda</span>
              {hud.bestScore > 0 && (
                <span className="font-mono-tabular text-amber-300">
                  BEST {hud.bestScore.toLocaleString('id-ID')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* IN-GAME HUD (Low-occlusion, pointer-events-none wrapper, no backdrop-filter) */}
      {gameState !== 'TITLE_MENU' && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-[11px] font-medium text-slate-400">SCORE</div>
              <div className="font-mono-tabular text-2xl font-bold text-white">
                {hud.score.toLocaleString('id-ID')}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">WAVE</div>
              <div className="font-mono-tabular text-2xl font-bold text-sky-300">
                {hud.wave}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">COMBO</div>
              <div className="font-mono-tabular text-2xl font-bold text-amber-300">
                ×{hud.combo}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="text-right">
              <div className="font-mono-tabular text-xs font-semibold text-slate-200">
                SHIELD {hud.shield}/{hud.maxShield}
                {hud.overdriveSec > 0 ? ` · OVERDRIVE ${hud.overdriveSec}s` : ''}
                {` · ${hud.dashReady ? 'DASH READY' : 'DASH CHARGING'}`}
              </div>
              <div className="mt-1.5 flex justify-end gap-1.5">
                {Array.from({ length: hud.maxShield }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-2 w-7 rounded-sm ${
                      idx < hud.shield ? 'bg-emerald-400' : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMuted((prev) => !prev)}
                aria-label={muted ? 'Nyalakan suara' : 'Bisukan suara'}
                className="rounded-lg border border-slate-700 bg-slate-900/90 p-2 text-slate-200 hover:bg-slate-800"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() =>
                  setGameState((prev) => (prev === 'PLAYING' ? 'PAUSED' : 'PLAYING'))
                }
                className="rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                {gameState === 'PAUSED' ? 'Resume' : 'Pause'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAUSED MODAL */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-6">
          <div className="w-full max-w-sm space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center shadow-2xl">
            <h2 className="text-2xl font-bold text-white">Game Paused</h2>
            <p className="font-mono-tabular text-sm text-slate-300">
              Score {hud.score.toLocaleString('id-ID')} · Wave {hud.wave}
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                autoFocus
                onClick={() => setGameState('PLAYING')}
                className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-300"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={startGame}
                className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-medium text-slate-100 hover:bg-slate-700"
              >
                Restart
              </button>
              <button
                type="button"
                onClick={onExit}
                className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-medium text-slate-300 hover:bg-slate-700"
              >
                Exit to Launcher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL */}
      {gameState === 'GAME_OVER' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-md space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-7 text-center shadow-2xl">
            <h2 className="text-2xl font-bold text-white">Mission Ended</h2>
            <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div>
                <div className="text-[11px] text-slate-400">SCORE</div>
                <div className="font-mono-tabular text-lg font-bold text-white">
                  {hud.score.toLocaleString('id-ID')}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">WAVE</div>
                <div className="font-mono-tabular text-lg font-bold text-sky-300">
                  {hud.wave}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">BEST</div>
                <div className="font-mono-tabular text-lg font-bold text-amber-300">
                  {hud.bestScore.toLocaleString('id-ID')}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                autoFocus
                onClick={startGame}
                className="flex-1 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-300 whitespace-nowrap shrink-0"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={onExit}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
              >
                Exit to Launcher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
