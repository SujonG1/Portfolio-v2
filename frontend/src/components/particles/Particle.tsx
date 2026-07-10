import React, { useEffect, useRef } from 'react';

const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let stars: Star[] = [];
    let nebulae: Nebula[] = [];
    let rafId = 0;
    let lastTime = performance.now();
    let resizeTimeout: number | undefined;
    let nextShootingStarAt = performance.now() + 10000 + Math.random() * 5000;

    // Target = raw cursor position. Mouse = eased/smoothed position that
    // everything actually reacts to, so motion never snaps or jitters.
    const targetMouse = { x: -10000, y: -10000 };
    const mouse = { x: -10000, y: -10000 };
    let mouseActive = 0; // 0..1, eased presence so the glow fades in/out softly

    const hoverRadius = 190;
    const coreRadius = 140; // inner radius where the bright "cluster" forms
    const maxLineDistance = 110;
    const maxLineDistanceSq = maxLineDistance * maxLineDistance;

    // ---------- Glow sprites (pre-rendered once, reused every frame) ----------
    type Sprite = { canvas: HTMLCanvasElement; size: number };
    const spriteCache = new Map<string, Sprite>();

    function makeGlowSprite(coreR: number, glowR: number, tint: string): Sprite {
      const key = `${coreR}-${glowR}-${tint}`;
      const cached = spriteCache.get(key);
      if (cached) return cached;

      const size = Math.ceil(glowR * 2);
      const off = document.createElement('canvas');
      off.width = size;
      off.height = size;
      const octx = off.getContext('2d')!;
      const cx = size / 2;
      const cy = size / 2;

      const gradient = octx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      gradient.addColorStop(0, `rgba(255,255,255,0.95)`);
      gradient.addColorStop(0.15, `${tint}`);
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      octx.fillStyle = gradient;
      octx.beginPath();
      octx.arc(cx, cy, glowR, 0, Math.PI * 2);
      octx.fill();

      // Bright solid core
      octx.beginPath();
      octx.fillStyle = 'rgba(255,255,255,0.9)';
      octx.arc(cx, cy, coreR, 0, Math.PI * 2);
      octx.fill();

      const sprite = { canvas: off, size };
      spriteCache.set(key, sprite);
      return sprite;
    }

    // Cooler, more blue/violet-white palette to match the reference image.
    const TINTS = [
      'rgba(199,210,254,0.55)', // soft indigo
      'rgba(224,231,255,0.5)', // cool blue-white
      'rgba(165,180,252,0.5)', // periwinkle
      'rgba(248,250,252,0.45)', // neutral white
    ];

    // Small helper: exponential ease-towards, framerate independent.
    function approach(current: number, target: number, rate: number, dt: number) {
      const t = 1 - Math.pow(1 - rate, dt);
      return current + (target - current) * t;
    }

    class Star {
      x: number;
      y: number;
      vx: number;
      vy: number;
      driftX: number;
      driftY: number;
      driftTimer: number;
      maxSpeed: number;
      coreR: number;
      glowR: number;
      tint: string;
      bright: boolean;
      sparkles: boolean;
      maxAlpha: number;
      minAlpha: number;
      alpha: number;
      twinklePhase: number;
      twinkleSpeed: number;
      sparklePhase: number;

      // Shooting-star state: any ambient star can be temporarily turned
      // into a shooting star rather than spawning a separate object.
      isShooting: boolean;
      shootVx: number;
      shootVy: number;
      shootLife: number;
      shootMaxLife: number;
      shootLength: number;

      constructor() {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.vx = (Math.random() - 0.5) * 0.35;
        this.vy = (Math.random() - 0.5) * 0.35;
        this.driftX = this.vx;
        this.driftY = this.vy;
        this.driftTimer = Math.random() * 4000;
        this.maxSpeed = 0.2 + Math.random() * 0.3;
        this.bright = Math.random() < 0.12;
        // A wider slice of stars now get the four-point sparkle flare,
        // like the crisp glinting points in the reference image.
        this.sparkles = this.bright || Math.random() < 0.18;
        this.coreR = this.bright ? Math.random() * 0.7 + 1.2 : Math.random() * 0.5 + 0.5;
        this.glowR = this.bright ? this.coreR * 10 : this.coreR * 5.5;
        this.tint = TINTS[Math.floor(Math.random() * TINTS.length)];
        this.maxAlpha = this.bright ? Math.random() * 0.2 + 0.8 : Math.random() * 0.4 + 0.35;
        this.minAlpha = this.bright ? 0.5 : Math.random() * 0.1 + 0.05;
        this.alpha = Math.random() * (this.maxAlpha - this.minAlpha) + this.minAlpha;
        this.twinklePhase = Math.random() * Math.PI * 2;
        this.twinkleSpeed = 0.0006 + Math.random() * 0.0009;
        this.sparklePhase = Math.random() * Math.PI * 2;

        this.isShooting = false;
        this.shootVx = 0;
        this.shootVy = 0;
        this.shootLife = 0;
        this.shootMaxLife = 0;
        this.shootLength = 0;
      }

      // Turns this ordinary star into a fast-streaking shooting star for
      // a short burst, then it settles back into normal ambient drifting.
      startShooting() {
        this.isShooting = true;
        const goingRight = Math.random() < 0.5;
        const speed = 9 + Math.random() * 6;
        const angle = goingRight
          ? (Math.PI / 5) + Math.random() * (Math.PI / 10)
          : Math.PI - (Math.PI / 5) - Math.random() * (Math.PI / 10);
        this.shootVx = Math.cos(angle) * speed * (goingRight ? 1 : -1);
        this.shootVy = Math.sin(angle) * speed;
        this.shootMaxLife = 55 + Math.random() * 20;
        this.shootLife = this.shootMaxLife;
        this.shootLength = 90 + Math.random() * 70;
      }

      update(dt: number, now: number) {
        if (this.isShooting) {
          this.x += this.shootVx * dt;
          this.y += this.shootVy * dt;
          this.shootLife -= dt;
          const margin = this.shootLength + 40;
          const offscreen = this.x < -margin || this.x > W + margin || this.y < -margin || this.y > H + margin;
          if (this.shootLife <= 0 || offscreen) {
            // Streak finished — settle back into calm ambient drifting
            // from wherever it ended up, no teleporting/respawning.
            this.isShooting = false;
            this.x = Math.min(Math.max(this.x, 0), W);
            this.y = Math.min(Math.max(this.y, 0), H);
            const angle = Math.random() * Math.PI * 2;
            const speed = this.maxSpeed * (0.4 + Math.random() * 0.6);
            this.driftX = Math.cos(angle) * speed;
            this.driftY = Math.sin(angle) * speed;
            this.vx = this.driftX;
            this.vy = this.driftY;
            this.driftTimer = 2500 + Math.random() * 3000;
          }

          this.twinklePhase += this.twinkleSpeed * dt * 16.6667;
          return;
        }

        this.driftTimer -= dt * 16.6667;
        if (this.driftTimer <= 0) {
          this.driftTimer = 2500 + Math.random() * 3000;
          const angle = Math.random() * Math.PI * 2;
          const speed = this.maxSpeed * (0.4 + Math.random() * 0.6);
          this.driftX = Math.cos(angle) * speed;
          this.driftY = Math.sin(angle) * speed;
        }
        this.vx = approach(this.vx, this.driftX, 0.02, dt);
        this.vy = approach(this.vy, this.driftY, 0.02, dt);

        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.x < 0 || this.x > W) this.vx *= -1;
        if (this.y < 0 || this.y > H) this.vy *= -1;
        this.x = Math.min(Math.max(this.x, 0), W);
        this.y = Math.min(Math.max(this.y, 0), H);

        if (mouseActive > 0.01) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < hoverRadius * hoverRadius) {
            const dist = Math.sqrt(distSq) || 1;
            const force = (1 - dist / hoverRadius) * mouseActive;
            // Very light pull toward the cursor — just a subtle lean,
            // not enough to ever drag stars all the way in and clump them.
            this.x += dx * force * 0.003 * dt;
            this.y += dy * force * 0.003 * dt;
          }
        }

        this.twinklePhase += this.twinkleSpeed * dt * 16.6667;
        const span = (this.maxAlpha - this.minAlpha) / 2;
        this.alpha = this.minAlpha + span + Math.sin(this.twinklePhase) * span;
      }

      draw(time: number) {
        if (this.isShooting) {
          const fadeIn = Math.min(1, (this.shootMaxLife - this.shootLife) / 8);
          const fadeOut = Math.min(1, this.shootLife / (this.shootMaxLife * 0.4));
          const alpha = Math.min(fadeIn, fadeOut);

          const mag = Math.hypot(this.shootVx, this.shootVy) || 1;
          const dirX = this.shootVx / mag;
          const dirY = this.shootVy / mag;
          const tailX = this.x - dirX * this.shootLength;
          const tailY = this.y - dirY * this.shootLength;

          const grad = ctx!.createLinearGradient(this.x, this.y, tailX, tailY);
          grad.addColorStop(0, `rgba(255,255,255,${0.95 * alpha})`);
          grad.addColorStop(0.25, `rgba(224,231,255,${0.55 * alpha})`);
          grad.addColorStop(1, 'rgba(199,210,254,0)');

          ctx!.strokeStyle = grad;
          ctx!.lineWidth = 1.4 + this.coreR * 0.6;
          ctx!.lineCap = 'round';
          ctx!.beginPath();
          ctx!.moveTo(this.x, this.y);
          ctx!.lineTo(tailX, tailY);
          ctx!.stroke();

          const headGrad = ctx!.createRadialGradient(this.x, this.y, 0, this.x, this.y, 4.5);
          headGrad.addColorStop(0, `rgba(255,255,255,${0.95 * alpha})`);
          headGrad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx!.fillStyle = headGrad;
          ctx!.beginPath();
          ctx!.arc(this.x, this.y, 4.5, 0, Math.PI * 2);
          ctx!.fill();
          return;
        }

        let boost = 0;
        if (mouseActive > 0.01) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < coreRadius) {
            boost = (1 - dist / coreRadius) * mouseActive;
          }
        }

        const drawAlpha = Math.min(1, this.alpha + boost * 0.25);
        const scale = 1 + boost * 0.35;
        const sprite = makeGlowSprite(this.coreR, this.glowR, this.tint);
        const drawSize = sprite.size * scale;

        ctx!.globalAlpha = drawAlpha;
        ctx!.drawImage(
          sprite.canvas,
          this.x - drawSize / 2,
          this.y - drawSize / 2,
          drawSize,
          drawSize
        );

        // Extra soft round glow (no cross/plus shape) so hovered/bright
        // stars just look like genuinely brighter, bigger stars.
        if (boost > 0.04) {
          const pulse = (Math.sin(time * 0.0012 + this.sparklePhase) * 0.5 + 0.5) * 0.3 + 0.7;
          const extraR = this.glowR * (1.1 + boost * 0.6) * pulse;
          const haloGrad = ctx!.createRadialGradient(this.x, this.y, 0, this.x, this.y, extraR);
          haloGrad.addColorStop(0, `rgba(255,255,255,${0.16 * boost})`);
          haloGrad.addColorStop(0.5, `rgba(224,231,255,${0.08 * boost})`);
          haloGrad.addColorStop(1, 'rgba(224,231,255,0)');
          ctx!.globalAlpha = 1;
          ctx!.fillStyle = haloGrad;
          ctx!.beginPath();
          ctx!.arc(this.x, this.y, extraR, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.globalAlpha = 1;
      }
    }

    class Nebula {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      radius: number;
      color: string;
      driftSpeed: number;
      phase: number;

      constructor(colors: string[]) {
        this.baseX = Math.random() * W;
        this.baseY = Math.random() * H;
        this.x = this.baseX;
        this.y = this.baseY;
        this.radius = Math.min(W, H) * (0.35 + Math.random() * 0.35);
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.driftSpeed = 0.00006 + Math.random() * 0.00008;
        this.phase = Math.random() * Math.PI * 2;
      }

      update(time: number) {
        this.x = this.baseX + Math.sin(time * this.driftSpeed + this.phase) * W * 0.08;
        this.y = this.baseY + Math.cos(time * this.driftSpeed * 0.8 + this.phase) * H * 0.08;
      }

      draw() {
        const gradient = ctx!.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx!.fillStyle = gradient;
        ctx!.fillRect(0, 0, W, H);
      }
    }

    // A shooting star is just an ordinary Star temporarily put into
    // "shooting" mode (see Star.startShooting) — no separate object.

    function getDocumentSize() {
      const el = document.documentElement;
      const body = document.body;
      return {
        width: Math.max(el.scrollWidth, body.scrollWidth, el.clientWidth),
        height: Math.max(el.scrollHeight, body.scrollHeight, el.clientHeight),
      };
    }

    function starCountFor(width: number, height: number) {
      const area = width * height;
      return Math.min(260, Math.max(70, Math.floor(area / 13000)));
    }

    function buildNebulae() {
      const colors = [
        'rgba(76,29,149,0.22)', // deep violet
        'rgba(30,64,175,0.18)', // indigo blue
        'rgba(8,47,73,0.22)', // deep teal
        'rgba(112,26,117,0.14)', // magenta haze
      ];
      const count = 4;
      nebulae = Array.from({ length: count }, () => new Nebula(colors));
    }

    function init() {
      const size = getDocumentSize();
      W = size.width;
      H = size.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      canvas!.style.width = `${W}px`;
      canvas!.style.height = `${H}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      buildNebulae();

      const count = starCountFor(W, H);
      if (stars.length === 0) {
        stars = Array.from({ length: count }, () => new Star());
      } else if (stars.length < count) {
        stars.push(...Array.from({ length: count - stars.length }, () => new Star()));
      } else if (stars.length > count) {
        stars.length = count;
      }
    }

    function scheduleResize() {
      if (resizeTimeout) window.clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(init, 150);
    }

    function drawConstellationLines() {
      const cellSize = maxLineDistance;
      const cols = Math.max(1, Math.ceil(W / cellSize));
      const rows = Math.max(1, Math.ceil(H / cellSize));
      const grid: Star[][] = new Array(cols * rows);

      const cellIndex = (x: number, y: number) => {
        const cx = Math.min(cols - 1, Math.max(0, Math.floor(x / cellSize)));
        const cy = Math.min(rows - 1, Math.max(0, Math.floor(y / cellSize)));
        return cy * cols + cx;
      };

      for (const s of stars) {
        const idx = cellIndex(s.x, s.y);
        (grid[idx] || (grid[idx] = [])).push(s);
      }

      ctx!.lineWidth = 0.5;
      ctx!.lineCap = 'round';
      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const idx = cy * cols + cx;
          const cellStars = grid[idx];
          if (!cellStars) continue;

          for (let ny = cy; ny <= cy + 1 && ny < rows; ny++) {
            const startNx = ny === cy ? cx : cx - 1;
            for (let nx = Math.max(0, startNx); nx <= cx + 1 && nx < cols; nx++) {
              const neighborIdx = ny * cols + nx;
              const neighborStars = grid[neighborIdx];
              if (!neighborStars) continue;
              const sameCell = neighborIdx === idx;

              for (let i = 0; i < cellStars.length; i++) {
                const s1 = cellStars[i];
                const startJ = sameCell ? i + 1 : 0;
                for (let j = startJ; j < neighborStars.length; j++) {
                  const s2 = neighborStars[j];
                  const dx = s1.x - s2.x;
                  const dy = s1.y - s2.y;
                  const distSq = dx * dx + dy * dy;
                  if (distSq < maxLineDistanceSq) {
                    const dist = Math.sqrt(distSq);
                    let lineBoost = 0;
                    if (mouseActive > 0.01) {
                      const mdx1 = mouse.x - s1.x;
                      const mdy1 = mouse.y - s1.y;
                      const mdx2 = mouse.x - s2.x;
                      const mdy2 = mouse.y - s2.y;
                      const d1 = Math.sqrt(mdx1 * mdx1 + mdy1 * mdy1);
                      const d2 = Math.sqrt(mdx2 * mdx2 + mdy2 * mdy2);
                      const closest = Math.min(d1, d2);
                      if (closest < coreRadius) {
                        // eased falloff (smoothstep) instead of linear,
                        // so the boost ramps in/out gently rather than
                        // creating a hard bright edge near the cursor
                        const t = 1 - closest / coreRadius;
                        lineBoost = (t * t * (3 - 2 * t)) * mouseActive;
                      }
                    }
                    // Smoothstep falloff by distance too, for a softer,
                    // less sharply-cut-off line as it approaches max range.
                    const rawT = 1 - dist / maxLineDistance;
                    const smoothT = rawT * rawT * (3 - 2 * rawT);
                    const baseOpacity = 0.09 * smoothT;
                    const opacity = Math.min(0.5, baseOpacity + lineBoost * 0.35);
                    ctx!.strokeStyle = `rgba(205,214,255,${opacity})`;
                    ctx!.lineWidth = 0.5 + lineBoost * 0.35;
                    ctx!.beginPath();
                    ctx!.moveTo(s1.x, s1.y);
                    ctx!.lineTo(s2.x, s2.y);
                    ctx!.stroke();
                  }
                }
              }
            }
          }
        }
      }
    }

    function drawCursorCluster() {
      if (mouseActive < 0.01) return;

      const glowR = coreRadius * 1.2;
      const gradient = ctx!.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, glowR);
      gradient.addColorStop(0, `rgba(199,210,254,${0.1 * mouseActive})`);
      gradient.addColorStop(0.4, `rgba(129,140,248,${0.06 * mouseActive})`);
      gradient.addColorStop(1, 'rgba(129,140,248,0)');
      ctx!.fillStyle = gradient;
      ctx!.beginPath();
      ctx!.arc(mouse.x, mouse.y, glowR, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.lineCap = 'round';
      for (const s of stars) {
        const dx = s.x - mouse.x;
        const dy = s.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < coreRadius) {
          const rawT = 1 - dist / coreRadius;
          const t = (rawT * rawT * (3 - 2 * rawT)) * mouseActive; // smoothstep
          ctx!.strokeStyle = `rgba(214,222,255,${0.08 * t})`;
          ctx!.lineWidth = 0.35 + t * 0.25;
          ctx!.beginPath();
          ctx!.moveTo(mouse.x, mouse.y);
          ctx!.lineTo(s.x, s.y);
          ctx!.stroke();
        }
      }

      const coreGrad = ctx!.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 7);
      coreGrad.addColorStop(0, `rgba(255,255,255,${0.4 * mouseActive})`);
      coreGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx!.fillStyle = coreGrad;
      ctx!.beginPath();
      ctx!.arc(mouse.x, mouse.y, 7, 0, Math.PI * 2);
      ctx!.fill();
    }

    function maybeSpawnShootingStar(now: number) {
      if (now >= nextShootingStarAt) {
        nextShootingStarAt = now + 10000 + Math.random() * 5000; // every 10-15s
        const candidates = stars.filter((s) => !s.isShooting);
        if (candidates.length > 0) {
          const chosen = candidates[Math.floor(Math.random() * candidates.length)];
          chosen.startShooting();
        }
      }
    }

    function animate(now: number) {
      const dt = Math.min(2.5, (now - lastTime) / 16.6667);
      lastTime = now;

      mouse.x = approach(mouse.x, targetMouse.x, 0.18, dt);
      mouse.y = approach(mouse.y, targetMouse.y, 0.18, dt);
      const wantsActive = targetMouse.x > -5000 ? 1 : 0;
      mouseActive = approach(mouseActive, wantsActive, 0.06, dt);

      // Deep space base
      ctx!.globalCompositeOperation = 'source-over';
      ctx!.fillStyle = '#020310';
      ctx!.fillRect(0, 0, W, H);

      // Foggy nebula haze, additive so overlapping clouds glow brighter
      ctx!.globalCompositeOperation = 'lighter';
      for (const n of nebulae) {
        n.update(now);
        n.draw();
      }

      ctx!.globalCompositeOperation = 'source-over';
      drawConstellationLines();

      ctx!.globalCompositeOperation = 'lighter';
      drawCursorCluster();

      for (const s of stars) {
        s.update(dt, now);
        s.draw(now);
      }

      maybeSpawnShootingStar(now);

      ctx!.globalCompositeOperation = 'source-over';

      rafId = requestAnimationFrame(animate);
    }

    init();
    rafId = requestAnimationFrame(animate);

    const handleMouseMove = (e: MouseEvent) => {
      targetMouse.x = e.pageX;
      targetMouse.y = e.pageY;
    };
    const handleMouseLeave = () => {
      targetMouse.x = -10000;
      targetMouse.y = -10000;
    };

    window.addEventListener('resize', scheduleResize, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseout', handleMouseLeave, { passive: true });

    const resizeObserver = new ResizeObserver(() => scheduleResize());
    resizeObserver.observe(document.body);

    return () => {
      cancelAnimationFrame(rafId);
      if (resizeTimeout) window.clearTimeout(resizeTimeout);
      window.removeEventListener('resize', scheduleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseLeave);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 block pointer-events-none z-0"
    />
  );
};

export default ParticleBackground;