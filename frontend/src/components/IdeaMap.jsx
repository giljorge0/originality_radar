// frontend/src/components/IdeaMap.jsx
// Renders the global idea map using the 2D coordinates returned by the backend's
// PCA projection. Similar ideas cluster together geometrically.
import React, { useRef, useEffect, useState } from 'react';
import { DENSITY_COLORS } from './ScoreMeter.jsx';

export default function IdeaMap({ data, currentResult }) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const ideasRef  = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data?.ideas?.length) return;

    const ctx = canvas.getContext('2d');
    const W   = canvas.width;
    const H   = canvas.height;
    const PAD = 20;

    // Map [-1, 1] coordinates to canvas pixels
    const toX = x => PAD + ((x + 1) / 2) * (W - PAD * 2);
    const toY = y => PAD + ((y + 1) / 2) * (H - PAD * 2);

    ideasRef.current = data.ideas.map(idea => ({
      ...idea,
      px: toX(idea.mapCoordinates?.x ?? 0),
      py: toY(idea.mapCoordinates?.y ?? 0),
    }));

    ctx.clearRect(0, 0, W, H);

    // Draw grid lines
    ctx.strokeStyle = '#0f1825';
    ctx.lineWidth   = 1;
    for (let i = 0; i <= 4; i++) {
      const x = PAD + (i / 4) * (W - PAD * 2);
      const y = PAD + (i / 4) * (H - PAD * 2);
      ctx.beginPath(); ctx.moveTo(x, PAD); ctx.lineTo(x, H - PAD); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    }

    // Draw all ideas
    for (const idea of ideasRef.current) {
      const color  = DENSITY_COLORS[idea.density] || '#336688';
      const isCurrent = currentResult && idea.id === currentResult.id;
      const radius = isCurrent ? 6 : 3;

      // Glow for current
      if (isCurrent) {
        const gradient = ctx.createRadialGradient(idea.px, idea.py, 0, idea.px, idea.py, 16);
        gradient.addColorStop(0, color + '55');
        gradient.addColorStop(1, color + '00');
        ctx.beginPath();
        ctx.arc(idea.px, idea.py, 16, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(idea.px, idea.py, radius, 0, Math.PI * 2);
      ctx.fillStyle = isCurrent ? color : color + 'aa';
      ctx.fill();
    }

    // Label for current idea
    if (currentResult) {
      const cur = ideasRef.current.find(i => i.id === currentResult.id);
      if (cur) {
        ctx.fillStyle    = '#c8d4e0';
        ctx.font         = '10px "SF Mono", monospace';
        ctx.textAlign    = 'left';
        const label = currentResult.idea.slice(0, 28) + (currentResult.idea.length > 28 ? '…' : '');
        ctx.fillText(label, Math.min(cur.px + 8, W - 140), cur.py + 4);
      }
    }

  }, [data, currentResult]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;

    const hit = ideasRef.current.find(idea => {
      const dx = idea.px - mx;
      const dy = idea.py - my;
      return Math.sqrt(dx * dx + dy * dy) < 8;
    });

    setTooltip(hit ? {
      idea:    hit.idea,
      score:   hit.score,
      density: hit.density,
      x:       e.clientX - rect.left,
      y:       e.clientY - rect.top,
    } : null);
  };

  return (
    <div style={{ position: 'relative', marginTop: 20, marginBottom: 8 }}>
      <div style={{
        fontSize:      11,
        color:         '#445566',
        letterSpacing: '0.12em',
        fontWeight:    600,
        marginBottom:  8,
      }}>
        GLOBAL IDEA MAP — {data.totalIdeas} IDEAS
      </div>
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={560}
          height={280}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
          style={{
            width:        '100%',
            height:       'auto',
            background:   '#080c14',
            border:       '1px solid #1a2233',
            borderRadius: 8,
            cursor:       'crosshair',
          }}
        />
        {tooltip && (
          <div style={{
            position:     'absolute',
            left:         tooltip.x + 12,
            top:          tooltip.y - 32,
            background:   '#0c1121',
            border:       `1px solid ${DENSITY_COLORS[tooltip.density]}44`,
            borderRadius: 6,
            padding:      '6px 10px',
            fontSize:     11,
            color:        '#c8d4e0',
            pointerEvents:'none',
            whiteSpace:   'nowrap',
            maxWidth:     220,
            zIndex:       10,
          }}>
            <div style={{ color: DENSITY_COLORS[tooltip.density], fontWeight: 600, marginBottom: 2 }}>
              {tooltip.density} · {tooltip.score}
            </div>
            {tooltip.idea.slice(0, 60)}{tooltip.idea.length > 60 ? '…' : ''}
          </div>
        )}
      </div>
      <div style={{
        display:        'flex',
        gap:            '12px 18px',
        flexWrap:       'wrap',
        marginTop:      8,
        justifyContent: 'center',
      }}>
        {Object.entries(DENSITY_COLORS).map(([label, color]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: color, boxShadow: `0 0 6px ${color}66`,
            }} />
            <span style={{ fontSize: 10, color: '#445566', letterSpacing: '0.05em' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
