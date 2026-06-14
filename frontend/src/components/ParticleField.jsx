// frontend/src/components/ParticleField.jsx
// Ambient background that reflects the density of ideas scanned in this session.
import React, { useRef, useEffect } from 'react';
import { DENSITY_COLORS } from './ScoreMeter.jsx';

export default function ParticleField({ results }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const particles = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Build particle set from session results + ambient particles
    const sessionParticles = results.map((r, i) => ({
      x:     canvas.width  * (0.1 + 0.8 * ((r.mapCoordinates?.x ?? 0) * 0.5 + 0.5)),
      y:     canvas.height * (0.1 + 0.8 * ((r.mapCoordinates?.y ?? 0) * 0.5 + 0.5)),
      vx:    (Math.random() - 0.5) * 0.15,
      vy:    (Math.random() - 0.5) * 0.15,
      size:  2.5,
      color: DENSITY_COLORS[r.density] || '#336688',
      alpha: 0.7,
      type:  'idea',
    }));

    // Ambient background dust
    const ambient = Array.from({ length: 60 }, () => ({
      x:    Math.random() * (canvas.width  || 1200),
      y:    Math.random() * (canvas.height || 800),
      vx:   (Math.random() - 0.5) * 0.08,
      vy:   (Math.random() - 0.5) * 0.08,
      size: Math.random() * 1.2 + 0.4,
      color:'#336688',
      alpha: Math.random() * 0.25 + 0.05,
      type: 'ambient',
    }));

    particles.current = [...ambient, ...sessionParticles];

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles.current) {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap
        if (p.x < -10) p.x = canvas.width  + 10;
        if (p.x > canvas.width  + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(p.alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [results]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset:    0,
        zIndex:   0,
        pointerEvents: 'none',
      }}
    />
  );
}
