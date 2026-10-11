import type { AgentState, SageMode } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  async getHealth(): Promise<{ status: string; name: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) throw new Error('Health check failed');
    return response.json();
  }

  async getState(): Promise<AgentState> {
    const response = await fetch(`${this.baseUrl}/api/state`);
    if (!response.ok) throw new Error('Failed to get state');
    return response.json();
  }

  async setMode(mode: SageMode): Promise<AgentState> {
    const response = await fetch(`${this.baseUrl}/api/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    if (!response.ok) throw new Error('Failed to set mode');
    return response.json();
  }
}

export const api = new ApiService();