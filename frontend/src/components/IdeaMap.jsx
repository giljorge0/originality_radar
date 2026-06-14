// frontend/src/components/IdeaMap.jsx — V2
// Features implemented:
// • Feature 1: Drift Journey — user's own pins brighter, dashed path connecting them
// • Feature 2: Domain filter — dimmed non-matching dots when a domain is active
// • Feature 3: Live ping animation — new ideas arriving over WS drop a ring
// • Feature 6: Touch events — tap for tooltip, resize observer for mobile

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DENSITY_COLORS } from './ScoreMeter.jsx';

export default function IdeaMap({ data, currentResult, userHistory, activeDomain, pingIdea, t }) {
  const canvasRef = useRef(null);
  const ideasRef = useRef([]);
  const pingsRef = useRef([]); // [{px, py, age}] — live ring animations
  const rafRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  // Map [-1,1] → canvas pixel
  const toPixel = useCallback((val, total, pad) =>
    pad + ((val + 1) / 2) * (total - pad * 2), []);

  // ── Drawing ────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height, PAD = 16;

    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = '#0d1520';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const xg = PAD + (i / 4) * (W - PAD * 2);
      const yg = PAD + (i / 4) * (H - PAD * 2);
      ctx.beginPath(); ctx.moveTo(xg, PAD); ctx.lineTo(xg, H - PAD); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PAD, yg); ctx.lineTo(W - PAD, yg); ctx.stroke();
    }

    const userIds = new Set((userHistory || []).map(r => r.id));

    // ── All global ideas (dim background) ───────────────────────────────────
    for (const idea of ideasRef.current) {
      const isUser = userIds.has(idea.id);
      const isCur = currentResult && idea.id === currentResult.id;
      const domainOk = !activeDomain || idea.domain === activeDomain;
      const color = DENSITY_COLORS[idea.density] || '#336688';

      if (isUser || isCur) continue; // drawn in next pass

      const alpha = domainOk ? 0.55 : 0.12;
      ctx.beginPath();
      ctx.arc(idea.px, idea.py, domainOk ? 2.5 : 2, 0, Math.PI * 2);
      ctx.fillStyle = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
      ctx.fill();
    }

    // ── Drift Journey: dashed path between user's ideas ─────────────────────
    const userPins = (userHistory || [])
      .map(r => ideasRef.current.find(i => i.id === r.id))
      .filter(Boolean);

    if (userPins.length >= 2) {
      ctx.save();
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = '#ffffff18';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(userPins[userPins.length - 1].px, userPins[userPins.length - 1].py);
      for (let i = userPins.length - 2; i >= 0; i--) {
        ctx.lineTo(userPins[i].px, userPins[i].py);
      }
      ctx.stroke();
      ctx.restore();
    }

    // ── User's pins (bright) ──────────────────────────────────────────────────
    for (const pin of userPins) {
      const isCur = currentResult && pin.id === currentResult.id;
      const color = DENSITY_COLORS[pin.density] || '#33aaff';
      const r = isCur ? 6 : 4;

      // Glow
      const grd = ctx.createRadialGradient(pin.px, pin.py, 0, pin.px, pin.py, r * 3.5);
      grd.addColorStop(0, color + '44');
      grd.addColorStop(1, color + '00');
      ctx.beginPath();
      ctx.arc(pin.px, pin.py, r * 3.5, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pin.px, pin.py, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Label for current
      if (isCur) {
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '10px "SF Mono", monospace';
        ctx.textAlign = 'left';
        const label = pin.idea.slice(0, 26) + (pin.idea.length > 26 ? '…' : '');
        const lx = Math.min(pin.px + 10, W - 140);
        ctx.fillText(label, lx, pin.py + 4);
      }
    }

    // ── Live pings (Feature 3) ────────────────────────────────────────────────
    pingsRef.current = pingsRef.current.filter(p => p.age < 60);
    for (const p of pingsRef.current) {
      const progress = p.age / 60;
      const radius = 4 + progress * 24;
      const alpha = (1 - progress) * 0.7;
      ctx.beginPath();
      ctx.arc(p.px, p.py, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(51,170,255,${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      p.age++;
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [data, userHistory, currentResult, activeDomain]);

  // ── Rebuild pixel coords when data changes ───────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data?.ideas?.length) return;
    const W = canvas.width, H = canvas.height, PAD = 16;
    ideasRef.current = data.ideas.map(idea => ({
      ...idea,
      px: toPixel(idea.mapCoordinates?.x ?? 0, W, PAD),
      py: toPixel(idea.mapCoordinates?.y ?? 0, H, PAD),
    }));
  }, [data, toPixel]);

  // ── Animate incoming WS idea as a ping ────────────────────────────────────────
  useEffect(() => {
    if (!pingIdea || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const PAD = 16;
    const px = toPixel(pingIdea.mapCoordinates?.x ?? 0, canvas.width, PAD);
    const py = toPixel(pingIdea.mapCoordinates?.y ?? 0, canvas.height, PAD);
    pingsRef.current.push({ px, py, age: 0 });
  }, [pingIdea, toPixel]);

  // ── Start / stop RAF ────────────────────────────────────────────────────────
  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // ── Resize observer (Feature 6) ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!container) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      canvas.width = w * window.devicePixelRatio;
      canvas.height = Math.round(w * 0.5) * window.devicePixelRatio;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${Math.round(w * 0.5)}px`;
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ── Hit-test helper (shared by mouse and touch) ────────────────────────────────
  const hitTest = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (clientX - rect.left) * scaleX;
    const my = (clientY - rect.top) * scaleY;
    return ideasRef.current.find(idea => {
      const dx = idea.px - mx, dy = idea.py - my;
      return Math.sqrt(dx * dx + dy * dy) < 10;
    }) || null;
  };

  const showTooltip = (hit, clientX, clientY) => {
    if (!hit) { setTooltip(null); return; }
    const rect = canvasRef.current.getBoundingClientRect();
    setTooltip({
      idea: hit.idea,
      score: hit.score,
      density: hit.density,
      domain: hit.domain,
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
  };

  // Mouse events
  const onMouseMove = (e) => showTooltip(hitTest(e.clientX, e.clientY), e.clientX, e.clientY);
  const onMouseLeave = () => setTooltip(null);

  // Touch events (Feature 6)
  const onTouchStart = (e) => {
    e.preventDefault();
    const t = e.touches[0];
    showTooltip(hitTest(t.clientX, t.clientY), t.clientX, t.clientY);
  };
  const onTouchEnd = () => setTimeout(() => setTooltip(null), 2000);

  if (!data?.ideas?.length) return null;

  return (
    <div style={{ position: 'relative', marginTop: 20, marginBottom: 8 }}>
      <div style={{
        fontSize: 10, color: '#2a3a4a', letterSpacing: '0.12em',
        fontWeight: 600, marginBottom: 8,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>{t.globalMap(data.totalIdeas)}</span>
        {activeDomain && (
          <span style={{ color: '#33aaff', fontSize: 9 }}>
            FILTER: {activeDomain}
          </span>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={560}
          height={280}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{
            width: '100%', height: 'auto',
            background: '#080c14',
            border: '1px solid #1a2233', borderRadius: 8,
            cursor: 'crosshair', touchAction: 'none', display: 'block',
          }}
        />

        {tooltip && (
          <div style={{
            position: 'absolute',
            left: Math.min(tooltip.x + 12, 300), top: Math.max(tooltip.y - 48, 8),
            background: '#0c1121',
            border: `1px solid ${DENSITY_COLORS[tooltip.density]}44`,
            borderRadius: 6, padding: '6px 10px', fontSize: 11,
            color: '#c8d4e0', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10,
          }}>
            <div style={{
              color: DENSITY_COLORS[tooltip.density], fontWeight: 600, marginBottom: 2,
              display: 'flex', gap: 8,
            }}>
              <span>{tooltip.density}</span>
              <span style={{ color: '#445566' }}>·</span>
              <span>{tooltip.score}</span>
              {tooltip.domain && (
                <>
                  <span style={{ color: '#445566' }}>·</span>
                  <span style={{ color: '#7a8a9a' }}>{tooltip.domain}</span>
                </>
              )}
            </div>
            {tooltip.idea.slice(0, 60)}{tooltip.idea.length > 60 ? '…' : ''}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: '10px 16px', flexWrap: 'wrap',
        marginTop: 8, justifyContent: 'center',
      }}>
        {Object.entries(DENSITY_COLORS).map(([label, color]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: color, boxShadow: `0 0 6px ${color}55`,
            }} />
            <span style={{ fontSize: 9, color: '#334455', letterSpacing: '0.05em' }}>
              {t.densityLabels[label] || label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
