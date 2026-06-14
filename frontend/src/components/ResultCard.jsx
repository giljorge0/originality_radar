// frontend/src/components/ResultCard.jsx
import React, { useState } from 'react';
import { DENSITY_COLORS } from './ScoreMeter.jsx';

export default function ResultCard({ result, index }) {
  const [expanded, setExpanded] = useState(false);
  const color = DENSITY_COLORS[result.density] || '#555';

  return (
    <div
      onClick={() => setExpanded(e => !e)}
      style={{
        background:   '#0c1121',
        border:       `1px solid ${color}22`,
        borderLeft:   `2px solid ${color}`,
        borderRadius: 8,
        padding:      '10px 14px',
        marginBottom: 8,
        cursor:       'pointer',
        transition:   'border-color 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1, marginRight: 12 }}>
          <span style={{
            fontSize:   13,
            color:      '#c8d4e0',
            fontWeight: 500,
            display:    'block',
            overflow:   'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: expanded ? 'normal' : 'nowrap',
          }}>
            {result.idea}
          </span>
          {!expanded && result.driftSuggestion && (
            <span style={{ fontSize: 11, color: '#556677', marginTop: 2, display: 'block' }}>
              💡 {result.driftSuggestion.slice(0, 80)}{result.driftSuggestion.length > 80 ? '…' : ''}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{
            fontSize:      13,
            fontWeight:    700,
            fontFamily:    "'SF Mono', monospace",
            color,
            textShadow:    `0 0 12px ${color}66`,
          }}>
            {result.score}
          </span>
          <span style={{
            fontSize:      10,
            fontWeight:    600,
            letterSpacing: '0.1em',
            color,
            minWidth:      68,
            textAlign:     'right',
          }}>
            {result.density}
          </span>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 10, fontSize: 12 }}>
          {result.nearestClusters?.length > 0 && (
            <div style={{ color: '#7a8a9a', marginBottom: 6 }}>
              <span style={{ color: '#445566' }}>Near: </span>
              {result.nearestClusters.join(' · ')}
            </div>
          )}
          {result.whatMakesItCommon && (
            <div style={{ color: '#996644', marginBottom: 4 }}>
              <span style={{ color: '#775533' }}>Common: </span>
              {result.whatMakesItCommon}
            </div>
          )}
          {result.whatMakesItNovel && (
            <div style={{ color: '#449966', marginBottom: 4 }}>
              <span style={{ color: '#337755' }}>Novel: </span>
              {result.whatMakesItNovel}
            </div>
          )}
          {result.driftSuggestion && (
            <div style={{
              marginTop:    8,
              padding:      '8px 10px',
              background:   '#111827',
              borderLeft:   `2px solid ${color}44`,
              borderRadius: 4,
              color:        '#99aacc',
            }}>
              💡 {result.driftSuggestion}
            </div>
          )}
          {result.nearestNeighbors?.length > 0 && (
            <div style={{ marginTop: 8, color: '#445566' }}>
              <span style={{ fontSize: 10, letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>
                NEAREST IN DATABASE
              </span>
              {result.nearestNeighbors.map((n, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: '#7a8a9a', fontSize: 11, flex: 1 }}>
                    {n.idea.slice(0, 55)}{n.idea.length > 55 ? '…' : ''}
                  </span>
                  <span style={{ color: '#556677', fontSize: 10, marginLeft: 8 }}>
                    {n.similarity}% sim
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
