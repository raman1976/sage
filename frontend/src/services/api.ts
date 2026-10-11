import type { AgentState, SageMode } from '../types';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

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

  /**
   * Conversational AI (Nemotron/Nebius) — only if the backend exposes it.
   * No keys live in the frontend; throws when unavailable so callers can
   * fall back to the offline comfort flow.
   */
  async chat(messages: ChatMessage[]): Promise<{ reply: string }> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    if (!response.ok) throw new Error('AI companion unavailable');
    return response.json();
  }
}

export const api = new ApiService();