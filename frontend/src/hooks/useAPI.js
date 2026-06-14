// frontend/src/hooks/useAPI.js — V2: domain filter param
import { useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function useAPI() {
  const scanIdea = useCallback(async (idea) => {
    const r = await fetch(`${API_URL}/api/ideas/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea }),
    });
    if (!r.ok) {
      const e = await r.json();
      throw new Error(e.error || 'Scan failed');
    }
    return r.json();
  }, []);

  // domain is optional — omit to get all
  const getMap = useCallback(async (domain) => {
    const url = domain
      ? `${API_URL}/api/ideas/map?domain=${encodeURIComponent(domain)}`
      : `${API_URL}/api/ideas/map`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('Map fetch failed');
    return r.json();
  }, []);

  const getStats = useCallback(async () => {
    const r = await fetch(`${API_URL}/api/ideas/stats`);
    if (!r.ok) throw new Error('Stats fetch failed');
    return r.json();
  }, []);

  return { scanIdea, getMap, getStats };
}
