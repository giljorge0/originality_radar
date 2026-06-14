// frontend/src/hooks/useAPI.js
import { useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function useAPI() {
  const scanIdea = useCallback(async (idea) => {
    const response = await fetch(`${API_URL}/api/ideas/scan`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ idea }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Scan failed');
    }
    return response.json();
  }, []);

  const getMap = useCallback(async () => {
    const response = await fetch(`${API_URL}/api/ideas/map`);
    if (!response.ok) throw new Error('Map fetch failed');
    return response.json();
  }, []);

  const getStats = useCallback(async () => {
    const response = await fetch(`${API_URL}/api/ideas/stats`);
    if (!response.ok) throw new Error('Stats fetch failed');
    return response.json();
  }, []);

  return { scanIdea, getMap, getStats };
}
