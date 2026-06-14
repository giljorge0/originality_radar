// frontend/src/components/OriginalityRadar.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ParticleField from './ParticleField.jsx';
import ScoreMeter, { DENSITY_COLORS } from './ScoreMeter.jsx';
import IdeaMap from './IdeaMap.jsx';
import ResultCard from './ResultCard.jsx';
import useAPI from '../hooks/useAPI.js';

export default function OriginalityRadar() {
  const [idea,          setIdea]          = useState('');
  const [loading,       setLoading]       = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const [history,       setHistory]       = useState([]);
  const [error,         setError]         = useState(null);
  const [status,        setStatus]        = useState('');
  const [mapData,       setMapData]       = useState(null);
  const { scanIdea, getMap } = useAPI();

  // Load initial map on mount
  useEffect(() => {
    getMap()
      .then(setMapData)
      .catch(() => {/* silently fail if backend not ready */});
  }, []);

  const analyze = useCallback(async () => {
    if (!idea.trim() || loading) return;

    setLoading(true);
    setError(null);
    setStatus('Generating real embedding via Voyage AI…');

    try {
      const result = await scanIdea(idea.trim());
      setCurrentResult(result);
      setHistory(prev => [result, ...prev]);
      setIdea('');

      setStatus('Fetching updated global map…');
      const updated = await getMap();
      setMapData(updated);
      setStatus(`✓ Scored against ${updated.totalIdeas} idea${updated.totalIdeas !== 1 ? 's' : ''} in global map`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Scan failed — check your API keys and try again.');
      setStatus('');
    } finally {
      setLoading(false);
    }
  }, [idea, loading]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      analyze();
    }
  };

  return (
    <div style={{
      minHeight:  '100vh',
      background: '#080c14',
      color:      '#c8d4e0',
      fontFamily: "'Inter', -apple-system, sans-serif",
      position:   'relative',
      overflow:   'hidden',
    }}>
      <ParticleField results={history} />

      <div style={{
        position:  'relative',
        zIndex:    1,
        maxWidth:  620,
        margin:    '0 auto',
        padding:   '40px 20px 60px',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{
            fontSize:      28,
            fontWeight:    300,
            letterSpacing: '0.12em',
            color:         '#e2e8f0',
            margin:        '0 0 4px',
          }}>
            ORIGINALITY RADAR
          </h1>
          <p style={{
            fontSize:      12,
            color:         '#445566',
            letterSpacing: '0.1em',
            margin:        0,
          }}>
            VOYAGE AI EMBEDDINGS · COSINE DISTANCE · GLOBAL VECTOR MAP
          </p>
          {mapData?.totalIdeas > 0 && (
            <p style={{
              fontSize:      11,
              color:         '#2a3a4a',
              letterSpacing: '0.08em',
              marginTop:     8,
            }}>
              {mapData.totalIdeas.toLocaleString()} idea{mapData.totalIdeas !== 1 ? 's' : ''} in the global map
            </p>
          )}
        </div>

        {/* Input */}
        <div style={{
          background:   '#0c1121',
          border:       '1px solid #1a2233',
          borderRadius: 12,
          padding:      16,
          marginBottom: 16,
        }}>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value.slice(0, 400))}
            onKeyDown={handleKey}
            placeholder="Describe your idea — how far from the known map?"
            rows={3}
            style={{
              width:      '100%',
              background: 'transparent',
              border:     'none',
              color:      '#c8d4e0',
              fontSize:   15,
              fontFamily: 'inherit',
              resize:     'vertical',
              outline:    'none',
              lineHeight: 1.6,
              boxSizing:  'border-box',
            }}
          />
          <div style={{
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            marginTop:      8,
          }}>
            <span style={{ fontSize: 11, color: '#334455' }}>
              {idea.length} / 400
            </span>
            <button
              onClick={analyze}
              disabled={!idea.trim() || loading}
              style={{
                background:    loading
                  ? '#1a2233'
                  : 'linear-gradient(135deg, #1a6baa, #7c3aed)',
                color:         '#e2e8f0',
                border:        'none',
                borderRadius:  8,
                padding:       '10px 28px',
                fontSize:      13,
                fontWeight:    600,
                letterSpacing: '0.08em',
                cursor:        loading ? 'wait' : !idea.trim() ? 'default' : 'pointer',
                opacity:       !idea.trim() ? 0.4 : 1,
                transition:    'all 0.3s',
              }}
            >
              {loading ? 'SCANNING…' : 'SCAN'}
            </button>
          </div>
        </div>

        {/* Status / Error */}
        {error && (
          <div style={{
            color:        '#ff5555',
            fontSize:     12,
            textAlign:    'center',
            marginBottom: 12,
            padding:      '8px 12px',
            background:   '#1a0a0a',
            borderRadius: 6,
            border:       '1px solid #441111',
          }}>
            {error}
          </div>
        )}
        {status && !error && (
          <div style={{ color: '#556677', fontSize: 11, textAlign: 'center', marginBottom: 12 }}>
            {status}
          </div>
        )}

        {/* Score + Analysis */}
        {(currentResult || loading) && (
          <div style={{
            display:       'flex',
            flexDirection: 'column',
            alignItems:    'center',
            marginBottom:  28,
          }}>
            <ScoreMeter
              score={currentResult?.score ?? 0}
              density={currentResult?.density ?? 'VOID'}
              loading={loading}
            />

            {currentResult && !loading && (
              <div style={{ width: '100%', marginTop: 14 }}>
                {/* Nearest clusters */}
                {currentResult.nearestClusters?.length > 0 && (
                  <div style={{ fontSize: 12, color: '#7a8a9a', marginBottom: 8 }}>
                    <span style={{ color: '#445566' }}>Near: </span>
                    {currentResult.nearestClusters.join(' · ')}
                  </div>
                )}

                {/* Common / Novel */}
                <div style={{
                  display:             'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap:                 8,
                  marginBottom:        10,
                }}>
                  <div style={{
                    padding:      '8px 12px',
                    background:   '#111827',
                    borderLeft:   '2px solid #ff883322',
                    borderRadius: 4,
                    fontSize:     11,
                  }}>
                    <div style={{ color: '#775533', marginBottom: 3, letterSpacing: '0.08em' }}>COMMON</div>
                    <div style={{ color: '#99887a' }}>{currentResult.whatMakesItCommon}</div>
                  </div>
                  <div style={{
                    padding:      '8px 12px',
                    background:   '#111827',
                    borderLeft:   '2px solid #33ddaa22',
                    borderRadius: 4,
                    fontSize:     11,
                  }}>
                    <div style={{ color: '#337755', marginBottom: 3, letterSpacing: '0.08em' }}>NOVEL</div>
                    <div style={{ color: '#7a9988' }}>{currentResult.whatMakesItNovel}</div>
                  </div>
                </div>

                {/* Drift suggestion */}
                <div style={{
                  padding:      '10px 14px',
                  background:   '#111827',
                  borderLeft:   `2px solid ${DENSITY_COLORS[currentResult.density]}44`,
                  borderRadius: 4,
                  fontSize:     12,
                  color:        '#99aacc',
                  lineHeight:   1.6,
                }}>
                  💡 {currentResult.driftSuggestion}
                </div>

                {/* Nearest neighbors */}
                {currentResult.nearestNeighbors?.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{
                      fontSize:      10,
                      color:         '#2a3a4a',
                      letterSpacing: '0.1em',
                      fontWeight:    600,
                      marginBottom:  6,
                    }}>
                      NEAREST IN DATABASE
                    </div>
                    {currentResult.nearestNeighbors.map((n, i) => (
                      <div key={i} style={{
                        display:        'flex',
                        justifyContent: 'space-between',
                        fontSize:       11,
                        color:          '#7a8a9a',
                        marginBottom:   3,
                        paddingBottom:  3,
                        borderBottom:   '1px solid #0f1825',
                      }}>
                        <span style={{ flex: 1, marginRight: 12 }}>
                          {n.idea.slice(0, 60)}{n.idea.length > 60 ? '…' : ''}
                        </span>
                        <span style={{ color: '#445566', flexShrink: 0 }}>
                          {n.similarity}% sim
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Idea Map */}
        {mapData && mapData.totalIdeas >= 2 && (
          <IdeaMap data={mapData} currentResult={currentResult} />
        )}

        {/* Session History */}
        {history.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{
              fontSize:      10,
              color:         '#2a3a4a',
              letterSpacing: '0.12em',
              fontWeight:    600,
              marginBottom:  10,
            }}>
              SESSION LOG — {history.length} IDEA{history.length > 1 ? 'S' : ''} SCANNED
            </div>
            {history.map((res, i) => (
              <ResultCard key={res.id ?? i} result={res} index={i} />
            ))}
          </div>
        )}

        {/* Empty state legend */}
        {!currentResult && !loading && history.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 48, padding: 24 }}>
            <div style={{
              display:        'flex',
              flexWrap:       'wrap',
              justifyContent: 'center',
              gap:            '10px 18px',
              marginBottom:   20,
            }}>
              {Object.entries(DENSITY_COLORS).map(([label, color]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width:        8,
                    height:       8,
                    borderRadius: '50%',
                    background:   color,
                    boxShadow:    `0 0 8px ${color}55`,
                  }} />
                  <span style={{ fontSize: 10, color: '#445566', letterSpacing: '0.06em' }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
            <p style={{
              fontSize:  13,
              color:     '#334455',
              lineHeight: 1.8,
              maxWidth:  400,
              margin:    '0 auto',
            }}>
              Your idea is converted to a real 1024-dimensional semantic vector via Voyage AI.
              Cosine distance to every stored idea gives an objective originality score.
              No hallucination — pure math.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
