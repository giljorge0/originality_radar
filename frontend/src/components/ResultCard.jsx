// frontend/src/components/ResultCard.jsx — V2 (Feature 4: Iterate button)
import React, { useState } from 'react';
import { DENSITY_COLORS } from './ScoreMeter.jsx';

export default function ResultCard({ result, onIterate, t }) {
  const [expanded, setExpanded] = useState(false);
  const color = DENSITY_COLORS[result.density] || '#555';

  return (
    <div style={{
      background: '#0c1121',
      border: `1px solid ${color}22`,
      borderLeft: `2px solid ${color}`,
      borderRadius: 8, padding: '10px 14px', marginBottom: 8,
    }}>
      {/* Header row — click to expand */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
      >
        <div style={{ flex: 1, marginRight: 12 }}>
          <span style={{
            fontSize: 13, color: '#c8d4e0', fontWeight: 500,
            display: 'block', overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: expanded ? 'normal' : 'nowrap',
          }}>
            {result.idea}
          </span>
          {!expanded && result.driftSuggestion && (
            <span style={{ fontSize: 11, color: '#445566', marginTop: 2, display: 'block' }}>
              💡 {result.driftSuggestion.slice(0, 80)}{result.driftSuggestion.length > 80 ? '…' : ''}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {result.domain && (
            <span style={{ fontSize: 9, color: '#334455', letterSpacing: '0.06em' }}>
              {result.domain}
            </span>
          )}
          <span style={{
            fontSize: 13, fontWeight: 700,
            fontFamily: "'SF Mono', monospace",
            color, textShadow: `0 0 12px ${color}55`,
          }}>
            {result.score}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
            color, minWidth: 68, textAlign: 'right',
          }}>
            {t?.densityLabels?.[result.density] ?? result.density}
          </span>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ marginTop: 10, fontSize: 12 }}>
          {result.nearestClusters?.length > 0 && (
            <div style={{ color: '#7a8a9a', marginBottom: 6 }}>
              <span style={{ color: '#445566' }}>{t?.nearLabel ?? 'Near'}: </span>
              {result.nearestClusters.join(' · ')}
            </div>
          )}

          {result.whatMakesItCommon && (
            <div style={{ color: '#996644', marginBottom: 4 }}>
              <span style={{ color: '#775533' }}>{t?.commonLabel ?? 'Common'}: </span>
              {result.whatMakesItCommon}
            </div>
          )}

          {result.whatMakesItNovel && (
            <div style={{ color: '#449966', marginBottom: 4 }}>
              <span style={{ color: '#337755' }}>{t?.novelLabel ?? 'Novel'}: </span>
              {result.whatMakesItNovel}
            </div>
          )}

          {/* Drift suggestion + Iterate button (Feature 4) */}
          {result.driftSuggestion && (
            <div style={{
              marginTop: 8, padding: '8px 10px', background: '#111827',
              borderLeft: `2px solid ${color}44`, borderRadius: 4, color: '#99aacc',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10,
            }}>
              <span style={{ lineHeight: 1.6 }}>💡 {result.driftSuggestion}</span>
              {onIterate && (
                <button
                  onClick={(e) => { e.stopPropagation(); onIterate(result.driftSuggestion); }}
                  style={{
                    flexShrink: 0, background: 'transparent',
                    border: `1px solid ${color}44`, borderRadius: 4,
                    color, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
                    padding: '4px 8px', cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => e.target.style.borderColor = color}
                  onMouseLeave={e => e.target.style.borderColor = `${color}44`}
                >
                  {t?.driftRefine ?? 'Iterate →'}
                </button>
              )}
            </div>
          )}

          {/* Nearest neighbors */}
          {result.nearestNeighbors?.length > 0 && (
            <div style={{ marginTop: 8, color: '#445566' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.08em', marginBottom: 4 }}>
                {t?.nearestDb ?? 'NEAREST IN DATABASE'}
              </div>
              {result.nearestNeighbors.map((n, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  marginBottom: 2, fontSize: 11,
                }}>
                  <span style={{ color: '#7a8a9a', flex: 1 }}>
                    {n.idea.slice(0, 55)}{n.idea.length > 55 ? '…' : ''}
                  </span>
                  <span style={{ color: '#445566', marginLeft: 8 }}>
                    {n.similarity}{t?.simLabel ?? '% sim'}
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
