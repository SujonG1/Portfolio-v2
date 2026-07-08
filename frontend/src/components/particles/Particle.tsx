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
    const hoverRadius = 160; 
    const maxLineDistance = 90; 

    class Particle {
      x: number; y: number; vx: number; vy: number; r: number; 
      alpha: number; maxAlpha: number; minAlpha: number; twinkleSpeed: number;
      currentAlpha: number;

      constructor() {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        
        this.r = Math.random() * 2 + 1.5; 
        
        this.maxAlpha = Math.random() * 0.3 + 0.6; 
        this.minAlpha = Math.random() * 0.15 + 0.15; 
        this.alpha = Math.random() * (this.maxAlpha - this.minAlpha) + this.minAlpha;
        this.currentAlpha = this.alpha;
        this.twinkleSpeed = Math.random() * 0.01 + 0.003; 
      }
      
      update() {
        this.x += this.vx; this.y += this.vy;
        if (this.x < 0 || this.x > W) this.vx *= -1;
        if (this.y < 0 || this.y > H) this.vy *= -1;

        this.alpha += this.twinkleSpeed;
        if (this.alpha >= this.maxAlpha || this.alpha <= this.minAlpha) {
          this.twinkleSpeed *= -1;
        }
        
        if (this.alpha < 0) this.alpha = 0;
        if (this.alpha > 1) this.alpha = 1;

        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < hoverRadius) {
          const proximityFactor = 1 - (distance / hoverRadius);
          this.currentAlpha = this.alpha + (1 - this.alpha) * proximityFactor * 0.9;
        } else {
          this.currentAlpha += (this.alpha - this.currentAlpha) * 0.1;
        }
      }
      
      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120, 110, 255, ${this.currentAlpha})`;
        ctx.fill();
      }
    }

    function drawLines() {
      if (!ctx) return;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];

          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

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
      
      const pageHeightFactor = Math.max(1, Math.floor(H / window.innerHeight));
      const totalStars = 320 * pageHeightFactor; 

      for (let i = 0; i < totalStars; i++) particles.push(new Particle());
    }

    let animationFrameId: number;
    function animate() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      
      drawLines();
      particles.forEach(p => { p.update(); p.draw(); });
      
      animationFrameId = requestAnimationFrame(animate);
    }

    const handleResize = () => {
      init();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.pageX;
      mouse.y = e.pageY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    init();
    animate();

    window.addEventListener('load', handleResize);
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      window.removeEventListener('load', handleResize);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block filter blur-[0.5px]" 
        style={{ transform: 'translate3d(0,0,0)' }} 
      />
    </div>
  );
};

export default ParticleBackground;
