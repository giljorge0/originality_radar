// frontend/src/components/OriginalityRadar.jsx — V2
// Feature 1: Drift Journey (localStorage session history + path on map)
// Feature 2: Domain filter UI
// Feature 3: Live WebSocket multiplayer
// Feature 4: Iterate button (via onIterate callback to ResultCard)
// Feature 5: Language switcher (i18n)
// Feature 6: Touch & responsive (propagated to IdeaMap / ParticleField)

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ParticleField from './ParticleField.jsx';
import ScoreMeter, { DENSITY_COLORS } from './ScoreMeter.jsx';
import IdeaMap from './IdeaMap.jsx';
import ResultCard from './ResultCard.jsx';
import useAPI from '../hooks/useAPI.js';
import useWebSocket from '../hooks/useWebSocket.js';
import { STRINGS, LANGUAGES } from '../i18n.js';

const STORAGE_KEY = 'originality-radar-history-v2';
const DOMAINS = ['Tech', 'Science', 'Art', 'Social', 'Commerce', 'Nature', 'Philosophy', 'Engineering'];

// ── localStorage helpers ─────────────────────────────────────────────────────
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}
function saveHistory(h) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(h.slice(0, 100))); } catch {}
}

export default function OriginalityRadar() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [idea, setIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');
  const [mapData, setMapData] = useState(null);
  const [activeDomain, setActiveDomain] = useState(null); // Feature 2
  const [lang, setLang] = useState('en'); // Feature 5
  const [pingIdea, setPingIdea] = useState(null); // Feature 3
  const [wsConnected, setWsConnected] = useState(false);

  // Feature 1: persistent history
  const [history, setHistory] = useState(() => loadHistory());

  const textareaRef = useRef(null);
  const { scanIdea, getMap } = useAPI();
  const t = STRINGS[lang];

  // ── WebSocket (Feature 3) ─────────────────────────────────────────────────
  const handleNewIdea = useCallback((payload) => {
    // Animate ping on the map
    setPingIdea({ ...payload, _ts: Date.now() });

    // Merge into mapData without re-fetching
    setMapData(prev => {
      if (!prev) return prev;
      const alreadyExists = prev.ideas.some(i => i.id === payload.id);
      if (alreadyExists) return prev;
      return {
        ...prev,
        totalIdeas: prev.totalIdeas + 1,
        ideas: [payload, ...prev.ideas].slice(0, 1000),
      };
    });
  }, []);

  const { isConnected } = useWebSocket({ onNewIdea: handleNewIdea });

  useEffect(() => {
    const iv = setInterval(() => setWsConnected(isConnected()), 2000);
    return () => clearInterval(iv);
  }, [isConnected]);

  // ── Load initial map ──────────────────────────────────────────────────────
  useEffect(() => {
    getMap(activeDomain).then(setMapData).catch(() => {});
  }, [activeDomain]);

  // ── Analyze ───────────────────────────────────────────────────────────────
  const analyze = useCallback(async () => {
    if (!idea.trim() || loading) return;
    setLoading(true);
    setError(null);
    setStatus(t.statusEmbedding);

    try {
      const result = await scanIdea(idea.trim());
      setCurrentResult(result);

      // Feature 1: persist to localStorage
      const next = [result, ...history.filter(r => r.id !== result.id)];
      setHistory(next);
      saveHistory(next);

      setIdea('');
      setStatus(t.statusMap);

      const updated = await getMap(activeDomain);
      setMapData(updated);
      setStatus(t.statusDone(updated.totalIdeas));
    } catch (err) {
      setError(err.message || 'Scan failed — check your API keys and try again.');
      setStatus('');
    } finally {
      setLoading(false);
    }
  }, [idea, loading, history, activeDomain, t]);

  // ── Feature 4: Iterate (inject drift suggestion into textarea) ──────────────
  const handleIterate = useCallback((driftSuggestion) => {
    setIdea(driftSuggestion.slice(0, 400));
    textareaRef.current?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ── Feature 2: Domain filter ─────────────────────────────────────────────────
  const toggleDomain = (domain) => {
    setActiveDomain(prev => prev === domain ? null : domain);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); analyze(); }
  };

  // Domain counts from map
  const domainCounts = mapData?.domainCounts || {};

  return (
    <div style={{
      minHeight: '100vh', background: '#080c14', color: '#c8d4e0',
      fontFamily: "'Inter', -apple-system, sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      <ParticleField results={history} />

      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 640, margin: '0 auto',
        padding: 'clamp(24px, 5vw, 40px) clamp(12px, 4vw, 20px) 60px',
      }}>
        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h1 style={{
              fontSize: 'clamp(20px, 5vw, 28px)',
              fontWeight: 300, letterSpacing: '0.12em', color: '#e2e8f0', margin: 0,
            }}>
              {t.appTitle}
            </h1>

            {/* Live indicator */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 9, color: wsConnected ? '#33ddaa' : '#334455',
              letterSpacing: '0.1em', fontWeight: 600,
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: wsConnected ? '#33ddaa' : '#334455',
                boxShadow: wsConnected ? '0 0 6px #33ddaa' : 'none',
              }} />
              {t.liveLabel}
            </div>
          </div>

          <p style={{ fontSize: 11, color: '#334455', letterSpacing: '0.1em', margin: '0 0 6px' }}>
            {t.appSubtitle}
          </p>

          {/* Language toggle (Feature 5) */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
            {Object.entries(LANGUAGES).map(([code, label]) => (
              <button key={code} onClick={() => setLang(code)} style={{
                background: lang === code ? '#1a2233' : 'transparent',
                border: `1px solid ${lang === code ? '#334455' : '#1a2233'}`,
                borderRadius: 4, padding: '2px 8px', fontSize: 10,
                color: lang === code ? '#99aacc' : '#334455',
                cursor: 'pointer', letterSpacing: '0.06em',
              }}>
                {label}
              </button>
            ))}
          </div>

          {mapData?.totalIdeas > 0 && (
            <p style={{ fontSize: 11, color: '#2a3a4a', letterSpacing: '0.08em', margin: 0 }}>
              {t.ideasInMap(mapData.totalIdeas)}
            </p>
          )}
        </div>

        {/* ── Domain filter bar (Feature 2) ───────────────────────────────────── */}
        {Object.keys(domainCounts).length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: '#2a3a4a', letterSpacing: '0.12em', marginBottom: 6, fontWeight: 600 }}>
              {t.filterLabel}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button
                onClick={() => setActiveDomain(null)}
                style={domainBtnStyle(activeDomain === null)}
              >
                {t.allDomains}
                {mapData?.totalIdeas ? <span style={domainCountStyle}>{mapData.totalIdeas}</span> : null}
              </button>
              {DOMAINS.filter(d => domainCounts[d]).map(d => (
                <button key={d} onClick={() => toggleDomain(d)} style={domainBtnStyle(activeDomain === d)}>
                  {d}
                  <span style={domainCountStyle}>{domainCounts[d]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Input ───────────────────────────────────────────────────────────── */}
        <div style={{
          background: '#0c1121', border: '1px solid #1a2233',
          borderRadius: 12, padding: 16, marginBottom: 14,
        }}>
          <textarea
            ref={textareaRef}
            value={idea}
            onChange={e => setIdea(e.target.value.slice(0, 400))}
            onKeyDown={handleKey}
            placeholder={t.inputPlaceholder}
            rows={3}
            style={{
              width: '100%', background: 'transparent', border: 'none',
              color: '#c8d4e0', fontSize: 'clamp(13px, 3vw, 15px)',
              fontFamily: 'inherit', resize: 'vertical', outline: 'none',
              lineHeight: 1.6, boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: '#2a3a4a' }}>{t.charCount(idea.length)}</span>
            <button
              onClick={analyze}
              disabled={!idea.trim() || loading}
              style={{
                background: loading ? '#1a2233' : 'linear-gradient(135deg, #1a6baa, #7c3aed)',
                color: '#e2e8f0', border: 'none', borderRadius: 8,
                padding: 'clamp(8px, 2vw, 10px) clamp(18px, 4vw, 28px)',
                fontSize: 13, fontWeight: 600, letterSpacing: '0.08em',
                cursor: loading ? 'wait' : !idea.trim() ? 'default' : 'pointer',
                opacity: !idea.trim() ? 0.4 : 1, transition: 'all 0.3s',
              }}
            >
              {loading ? t.scanningBtn : t.scanBtn}
            </button>
          </div>
        </div>

        {/* Status / Error */}
        {error && (
          <div style={{
            color: '#ff5555', fontSize: 12, textAlign: 'center', marginBottom: 12,
            padding: '8px 12px', background: '#1a0a0a', borderRadius: 6, border: '1px solid #441111',
          }}>
            {error}
          </div>
        )}
        {status && !error && (
          <div style={{ color: '#445566', fontSize: 11, textAlign: 'center', marginBottom: 12 }}>
            {status}
          </div>
        )}

        {/* ── Score + Analysis ─────────────────────────────────────────────────── */}
        {(currentResult || loading) && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
            <ScoreMeter
              score={currentResult?.score ?? 0}
              density={currentResult?.density ?? 'VOID'}
              loading={loading}
              t={t}
            />

            {currentResult && !loading && (
              <div style={{ width: '100%', marginTop: 14 }}>
                {currentResult.nearestClusters?.length > 0 && (
                  <div style={{ fontSize: 12, color: '#7a8a9a', marginBottom: 8 }}>
                    <span style={{ color: '#445566' }}>{t.nearLabel}: </span>
                    {currentResult.nearestClusters.join(' · ')}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div style={{
                    padding: '8px 12px', background: '#111827',
                    borderLeft: '2px solid #ff883322', borderRadius: 4, fontSize: 11,
                  }}>
                    <div style={{ color: '#775533', marginBottom: 3, letterSpacing: '0.08em' }}>
                      {t.commonLabel}
                    </div>
                    <div style={{ color: '#99887a' }}>{currentResult.whatMakesItCommon}</div>
                  </div>
                  <div style={{
                    padding: '8px 12px', background: '#111827',
                    borderLeft: '2px solid #33ddaa22', borderRadius: 4, fontSize: 11,
                  }}>
                    <div style={{ color: '#337755', marginBottom: 3, letterSpacing: '0.08em' }}>
                      {t.novelLabel}
                    </div>
                    <div style={{ color: '#7a9988' }}>{currentResult.whatMakesItNovel}</div>
                  </div>
                </div>

                {/* Drift suggestion with Iterate (Feature 4) */}
                <div style={{
                  padding: '10px 14px', background: '#111827',
                  borderLeft: `2px solid ${DENSITY_COLORS[currentResult.density]}44`,
                  borderRadius: 4, fontSize: 12, color: '#99aacc', lineHeight: 1.6,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10,
                }}>
                  <span>💡 {currentResult.driftSuggestion}</span>
                  <button
                    onClick={() => handleIterate(currentResult.driftSuggestion)}
                    style={{
                      flexShrink: 0, background: 'transparent',
                      border: `1px solid ${DENSITY_COLORS[currentResult.density]}44`,
                      borderRadius: 4, color: DENSITY_COLORS[currentResult.density],
                      fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
                      padding: '4px 8px', cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    {t.driftRefine}
                  </button>
                </div>

                {/* Nearest neighbors */}
                {currentResult.nearestNeighbors?.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 10, color: '#2a3a4a', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>
                      {t.nearestDb}
                    </div>
                    {currentResult.nearestNeighbors.map((n, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between',
                        fontSize: 11, color: '#7a8a9a', marginBottom: 3,
                        paddingBottom: 3, borderBottom: '1px solid #0f1825',
                      }}>
                        <span style={{ flex: 1, marginRight: 12 }}>
                          {n.idea.slice(0, 60)}{n.idea.length > 60 ? '…' : ''}
                        </span>
                        <span style={{ color: '#445566', flexShrink: 0 }}>
                          {n.similarity}{t.simLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Idea Map (Feature 1 + 2 + 3) ─────────────────────────────────────── */}
        {mapData && mapData.totalIdeas >= 2 && (
          <IdeaMap
            data={mapData}
            currentResult={currentResult}
            userHistory={history} // Feature 1: drift journey
            activeDomain={activeDomain} // Feature 2: domain filter
            pingIdea={pingIdea} // Feature 3: live ping
            t={t}
          />
        )}

        {/* ── Session History ──────────────────────────────────────────────────── */}
        {history.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{
              fontSize: 10, color: '#2a3a4a', letterSpacing: '0.12em',
              fontWeight: 600, marginBottom: 10,
            }}>
              {t.sessionLog(history.length)}
            </div>
            {history.map((res, i) => (
              <ResultCard
                key={res.id ?? i}
                result={res}
                onIterate={handleIterate} // Feature 4
                t={t}
              />
            ))}
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────────────────── */}
        {!currentResult && !loading && history.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 40, padding: 24 }}>
            <div style={{
              display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
              gap: '10px 18px', marginBottom: 20,
            }}>
              {Object.entries(DENSITY_COLORS).map(([label, color]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: color, boxShadow: `0 0 7px ${color}55`,
                  }} />
                  <span style={{ fontSize: 10, color: '#445566', letterSpacing: '0.06em' }}>
                    {t.densityLabels[label]}
                  </span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 13, color: '#334455', lineHeight: 1.8, maxWidth: 400, margin: '0 auto' }}>
              {t.emptyBody}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Style helpers ──────────────────────────────────────────────────────────────
const domainBtnStyle = (active) => ({
  background: active ? '#1a2a44' : 'transparent',
  border: `1px solid ${active ? '#33aaff55' : '#1a2233'}`,
  borderRadius: 4,
  padding: '3px 8px',
  fontSize: 10,
  color: active ? '#33aaff' : '#445566',
  cursor: 'pointer',
  letterSpacing: '0.05em',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  transition: 'all 0.2s',
});

const domainCountStyle = {
  background: '#0f1825',
  borderRadius: 3,
  padding: '0 4px',
  fontSize: 9,
  color: '#334455',
};
