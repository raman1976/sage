import { useState, useEffect, useCallback, useRef } from 'react';
import type { SageMode, AgentState } from '../types';
import { api } from '../services/api';

export const useAgentState = (pollInterval: number = 3000) => {
  const [state, setState] = useState<AgentState>({ mode: 'idle' });
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // False when the backend can't persist modes (e.g. no POST route) — the
  // frontend then stays the source of truth so polls don't revert the UI.
  const backendAuthoritative = useRef(true);

  const fetchState = useCallback(async () => {
    try {
      const data = await api.getState();
      if (backendAuthoritative.current) {
        setState(data);
      }
      setIsConnected(true);
      setError(null);
    } catch (err) {
      setIsConnected(false);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, pollInterval);
    return () => clearInterval(interval);
  }, [fetchState, pollInterval]);

  const setMode = useCallback(async (mode: SageMode) => {
    // Update locally first so the UI responds instantly and works offline;
    // backend sync is best-effort.
    setState({ mode });
    try {
      const data = await api.setMode(mode);
      backendAuthoritative.current = true;
      setState(data);
      return data;
    } catch (err) {
      backendAuthoritative.current = false;
      setError(err instanceof Error ? err.message : 'Failed to set mode');
      return { mode };
    }
  }, []);

  return { state, isConnected, error, setMode, refresh: fetchState };
};

export const useHealthCheck = () => {
  const [isHealthy, setIsHealthy] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        await api.getHealth();
        setIsHealthy(true);
      } catch {
        setIsHealthy(false);
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  return isHealthy;
};