import React, { useEffect, useRef } from 'react';

const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W: number, H: number;
    let particles: Particle[] = [];
    let dpr = 1;
    
    const mouse = { x: -1000, y: -1000 };
    const hoverRadius = 200;
    const maxLineDistance = 90;

    class Particle {
      originX: number; originY: number;
      x: number; y: number; vx: number; vy: number; r: number; baseR: number;
      alpha: number; maxAlpha: number; minAlpha: number; twinkleSpeed: number;
      currentAlpha: number; glowIntensity: number;

      constructor() {
        this.originX = Math.random() * W;
        this.originY = Math.random() * H;
        this.x = this.originX;
        this.y = this.originY;
        this.vx = (Math.random() - 0.5) * 0.1; 
        this.vy = (Math.random() - 0.5) * 0.1;
        this.r = Math.random() * 2 + 1.5;
        this.baseR = this.r;
        this.maxAlpha = Math.random() * 0.3 + 0.6;
        this.minAlpha = Math.random() * 0.15 + 0.15;
        this.alpha = Math.random() * (this.maxAlpha - this.minAlpha) + this.minAlpha;
        this.currentAlpha = this.alpha;
        this.twinkleSpeed = Math.random() * 0.01 + 0.003;
        this.glowIntensity = Math.random() * 10 + 5;
      }
      
      update() {
        this.originX += this.vx;
        this.originY += this.vy;
        if (this.originX < 0 || this.originX > W) this.vx *= -1;
        if (this.originY < 0 || this.originY > H) this.vy *= -1;

        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ease = 0.05; 

        if (dist < hoverRadius) {
          const force = (1 - dist / hoverRadius);
          // Reduced pull force from 0.15 to 0.05 for a subtler effect
          this.x += (mouse.x - this.x) * (force * 0.05);
          this.y += (mouse.y - this.y) * (force * 0.05);
          this.r += (this.baseR + (force * 2) - this.r) * ease;
          this.currentAlpha += (1 - this.currentAlpha) * ease;
        } else {
          this.x += (this.originX - this.x) * ease;
          this.y += (this.originY - this.y) * ease;
          this.r += (this.baseR - this.r) * ease;
          this.currentAlpha += (this.alpha - this.currentAlpha) * ease;
        }

        this.alpha += this.twinkleSpeed;
        if (this.alpha >= this.maxAlpha || this.alpha <= this.minAlpha) this.twinkleSpeed *= -1;
      }
      
      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.shadowBlur = this.glowIntensity + (this.r - this.baseR) * 15;
        ctx.shadowColor = `rgba(120, 110, 255, ${this.currentAlpha})`;
        ctx.fillStyle = `rgba(120, 110, 255, ${this.currentAlpha})`;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    function drawFog() {
      if (!ctx) return;
      const time = Date.now() * 0.0005;
      const gradient = ctx.createRadialGradient(W / 2 + Math.sin(time) * 100, H / 2 + Math.cos(time) * 100, 0, W / 2, H / 2, W);
      gradient.addColorStop(0, 'rgba(50, 50, 100, 0.1)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);
    }

    function drawLines() {
      if (!ctx) return;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dist = Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2);
          if (dist < maxLineDistance) {
            const alphaFactor = 1 - (dist / maxLineDistance);
            const combinedAlpha = ((p1.currentAlpha + p2.currentAlpha) / 2) * alphaFactor * 0.6;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(120, 110, 255, ${combinedAlpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
    }

    function init() {
      if (!canvas) return;
      W = document.documentElement.scrollWidth || window.innerWidth;
      H = document.documentElement.scrollHeight || window.innerHeight;
      dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = [];
      for (let i = 0; i < 320; i++) particles.push(new Particle());
    }

    let animationFrameId: number;
    function animate() {
      if (!ctx) return;
      // Added semi-transparent fill for motion blur effect
      ctx.fillStyle = 'rgba(5, 5, 10, 0.2)';
      ctx.fillRect(0, 0, W, H);
      
      drawFog();
      drawLines();
      particles.forEach(p => { p.update(); p.draw(); });
      animationFrameId = requestAnimationFrame(animate);
    }

    const handleResize = () => init();
    const handleMouseMove = (e: MouseEvent) => { mouse.x = e.pageX; mouse.y = e.pageY; };
    const handleMouseLeave = () => { mouse.x = -1000; mouse.y = -1000; };

    init();
    animate();

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full block" style={{ transform: 'translate3d(0,0,0)' }} />
    </div>
  );
};

export default ParticleBackground;