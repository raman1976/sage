import { useState, useEffect, useCallback } from 'react';
import type { SageMode, AgentState } from '../types';
import { api } from '../services/api';

export const useAgentState = (pollInterval: number = 3000) => {
  const [state, setState] = useState<AgentState>({ mode: 'idle' });
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const data = await api.getState();
      setState(data);
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
    try {
      const data = await api.setMode(mode);
      setState(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set mode');
      throw err;
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