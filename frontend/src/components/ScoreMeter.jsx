// frontend/src/components/ScoreMeter.jsx
import React from 'react';

export const DENSITY_COLORS = {
  SATURATED: '#ff3333',
  DENSE:     '#ff8833',
  POPULATED: '#ffcc33',
  SPARSE:    '#33ddaa',
  FRONTIER:  '#33aaff',
  VOID:      '#aa55ff',
};

const DENSITY_GLOW = {
  SATURATED: '0 0 40px rgba(255,51,51,0.5)',
  DENSE:     '0 0 40px rgba(255,136,51,0.4)',
  POPULATED: '0 0 40px rgba(255,204,51,0.3)',
  SPARSE:    '0 0 40px rgba(51,221,170,0.3)',
  FRONTIER:  '0 0 40px rgba(51,170,255,0.4)',
  VOID:      '0 0 60px rgba(170,85,255,0.6)',
};

export default function ScoreMeter({ score, density, loading }) {
  const color        = DENSITY_COLORS[density] || '#555';
  const circumference = 2 * Math.PI * 72;
  const offset        = circumference - (score / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: 180, height: 180 }}>
      <svg
        viewBox="0 0 160 160"
        style={{
          width:    '100%',
          height:   '100%',
          transform:'rotate(-90deg)',
          overflow: 'visible',
        }}
      >
        <circle cx="80" cy="80" r="72" fill="none" stroke="#1a1f2e" strokeWidth="6" />
        <circle
          cx="80" cy="80" r="72"
          fill="none"
          stroke={loading ? '#1a2233' : color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={loading ? circumference : offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1), stroke 0.6s',
          }}
        />
      </svg>
      <div style={{
        position:       'absolute',
        inset:          0,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
      }}>
        <span style={{
          fontSize:   42,
          fontWeight: 700,
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          color:      loading ? '#333' : color,
          transition: 'color 0.6s',
          textShadow: loading ? 'none' : DENSITY_GLOW[density],
        }}>
          {loading ? '···' : score}
        </span>
        <span style={{
          fontSize:      11,
          fontWeight:    600,
          letterSpacing: '0.15em',
          color:         loading ? '#444' : color,
          transition:    'color 0.6s',
          marginTop:     2,
        }}>
          {loading ? 'SCANNING' : density}
        </span>
      </div>
    </div>
  );
}
