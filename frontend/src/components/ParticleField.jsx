// frontend/src/components/ParticleField.jsx — V2 (Feature 6: ResizeObserver)
import React, { useRef, useEffect } from 'react';
import { DENSITY_COLORS } from './ScoreMeter.jsx';

export default function ParticleField({ results }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const stateRef = useRef({ particles: [], w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      stateRef.current.w = canvas.width;
      stateRef.current.h = canvas.height;
    };
    resize();

    // Ambient particles
    const ambient = Array.from({ length: 55 }, () => ({
      x: Math.random() * stateRef.current.w,
      y: Math.random() * stateRef.current.h,
      vx: (Math.random() - 0.5) * 0.07,
      vy: (Math.random() - 0.5) * 0.07,
      size: Math.random() * 1.2 + 0.4,
      color: '#336688',
      alpha: Math.random() * 0.22 + 0.04,
    }));

    // Session idea particles (brighter, positioned near their map coords)
    const ideaParticles = results.map(r => ({
      x: stateRef.current.w * (0.1 + 0.8 * ((r.mapCoordinates?.x ?? 0) * 0.5 + 0.5)),
      y: stateRef.current.h * (0.1 + 0.8 * ((r.mapCoordinates?.y ?? 0) * 0.5 + 0.5)),
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      size: 2.5,
      color: DENSITY_COLORS[r.density] || '#336688',
      alpha: 0.65,
    }));

    stateRef.current.particles = [...ambient, ...ideaParticles];

    const draw = () => {
      const { w, h, particles } = stateRef.current;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(p.alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [results]);

  return (
    <canvas ref={canvasRef} style={{
      position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
    }} />
  );
}
