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

    const mouse = { x: -10000, y: -10000 };
    const hoverRadius = 180;
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

    const TINTS = [
      'rgba(224,231,255,0.5)', // cool blue-white
      'rgba(255,244,224,0.5)', // warm ivory
      'rgba(248,250,252,0.5)', // neutral white
      'rgba(199,210,254,0.45)', // soft indigo
    ];

    class Star {
      x: number;
      y: number;
      vx: number;
      vy: number;
      maxSpeed: number;
      coreR: number;
      glowR: number;
      tint: string;
      bright: boolean;
      maxAlpha: number;
      minAlpha: number;
      alpha: number;
      twinkleSpeed: number;
      sparklePhase: number;

      constructor() {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.vx = (Math.random() - 0.5) * 0.35;
        this.vy = (Math.random() - 0.5) * 0.35;
        this.maxSpeed = 0.2 + Math.random() * 0.3;
        this.bright = Math.random() < 0.08;
        this.coreR = this.bright ? Math.random() * 0.6 + 1.1 : Math.random() * 0.5 + 0.5;
        this.glowR = this.bright ? this.coreR * 9 : this.coreR * 5;
        this.tint = TINTS[Math.floor(Math.random() * TINTS.length)];
        this.maxAlpha = this.bright ? Math.random() * 0.25 + 0.75 : Math.random() * 0.4 + 0.35;
        this.minAlpha = this.bright ? 0.45 : Math.random() * 0.1 + 0.05;
        this.alpha = Math.random() * (this.maxAlpha - this.minAlpha) + this.minAlpha;
        this.twinkleSpeed = (Math.random() - 0.5) * 0.015;
        this.sparklePhase = Math.random() * Math.PI * 2;
      }

      update(dt: number) {
        // Independent random-walk so no two stars share a drift pattern.
        this.vx += (Math.random() - 0.5) * 0.015;
        this.vy += (Math.random() - 0.5) * 0.015;
        const speed = Math.hypot(this.vx, this.vy);
        if (speed > this.maxSpeed) {
          const scale = this.maxSpeed / speed;
          this.vx *= scale;
          this.vy *= scale;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.x < 0 || this.x > W) this.vx *= -1;
        if (this.y < 0 || this.y > H) this.vy *= -1;
        this.x = Math.min(Math.max(this.x, 0), W);
        this.y = Math.min(Math.max(this.y, 0), H);

        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < hoverRadius * hoverRadius) {
          const dist = Math.sqrt(distSq) || 1;
          const force = 1 - dist / hoverRadius;
          this.x -= dx * force * 0.04;
          this.y -= dy * force * 0.04;
        }

        this.alpha += this.twinkleSpeed * dt;
        if (this.alpha > this.maxAlpha || this.alpha < this.minAlpha) this.twinkleSpeed *= -1;
      }

      draw(time: number) {
        const sprite = makeGlowSprite(this.coreR, this.glowR, this.tint);
        ctx!.globalAlpha = this.alpha;
        ctx!.drawImage(sprite.canvas, this.x - sprite.size / 2, this.y - sprite.size / 2);

        if (this.bright) {
          // Faint four-point sparkle flare for the brightest stars
          const flare = (Math.sin(time * 0.001 + this.sparklePhase) * 0.5 + 0.5) * 0.5 + 0.15;
          const len = this.glowR * 1.6;
          ctx!.globalAlpha = this.alpha * flare;
          ctx!.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx!.lineWidth = 0.6;
          ctx!.beginPath();
          ctx!.moveTo(this.x - len, this.y);
          ctx!.lineTo(this.x + len, this.y);
          ctx!.moveTo(this.x, this.y - len);
          ctx!.lineTo(this.x, this.y + len);
          ctx!.stroke();
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

      ctx!.lineWidth = 0.6;
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
                    ctx!.strokeStyle = `rgba(199,210,254,${0.12 * (1 - dist / maxLineDistance)})`;
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

    function animate(now: number) {
      const dt = Math.min(2.5, (now - lastTime) / 16.6667);
      lastTime = now;

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
      for (const s of stars) {
        s.update(dt);
        s.draw(now);
      }
      ctx!.globalCompositeOperation = 'source-over';

      rafId = requestAnimationFrame(animate);
    }

    init();
    rafId = requestAnimationFrame(animate);

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.pageX;
      mouse.y = e.pageY;
    };
    const handleMouseLeave = () => {
      mouse.x = -10000;
      mouse.y = -10000;
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