import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type ChatMessage } from '../services/api';
import { getSagePersonality, type SagePersonality } from '../services/personality';

export interface SageChatMessage extends ChatMessage {
  id: string;
}

export type SageChatStatus = 'idle' | 'thinking' | 'error';

const STORE_KEY = 'sage_home_chat';
const ARCHIVE_KEY = 'sage_home_chat_archive';
const MAX_STORED = 50;
const MAX_ARCHIVED_SESSIONS = 3;
const REQUEST_TIMEOUT_MS = 30000;

let uid = 1;
const nid = () => `home-${Date.now()}-${uid++}`;

/** Archive a finished session so stored history is preserved, never deleted. */
function archiveSession(msgs: SageChatMessage[]) {
  if (msgs.length === 0) return;
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed : [];
    list.unshift({
      at: Date.now(),
      messages: msgs.slice(-MAX_STORED).map(({ role, content }) => ({ role, content })),
    });
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(list.slice(0, MAX_ARCHIVED_SESSIONS)));
  } catch {
    /* storage unavailable */
  }
}

// Guarded at module scope so a remount never archives the same log twice.
let didArchiveOnMount = false;

function loadHistory(): SageChatMessage[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<{ role: string; content: string }>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-MAX_STORED)
      .map((m) => ({ id: nid(), role: m.role as 'user' | 'assistant', content: m.content }));
  } catch {
    return [];
  }
}

/** Signals that the model narrated its own reasoning/rules instead of replying. */
const META_REASONING_PHRASES = [
  'conversation history',
  'system prompt',
  'these instructions',
  'my instructions',
  'following the rules',
  'follow the rules',
  'the rules say',
  'the rules state',
  'conversation rules',
  'one short friendly line',
  'casual follow-up question',
  'let me keep it brief',
  'let me think this through',
  'let me figure out',
  'i should respond',
  'i need to respond',
  'introduce myself again',
];

/** Frontend safety net: never display anything resembling a reasoning trace. */
function looksLikeReasoning(text: string): boolean {
  const t = text.trim();
  const low = t.toLowerCase();
  const head = low.slice(0, 240);
  if (
    head.includes('thinking process') ||
    head.includes('chain of thought') ||
    head.includes('<think>') ||
    head.includes('analyze user input') ||
    head.includes('draft response') ||
    head.includes('(internal)') ||
    head.startsWith('reasoning:') ||
    META_REASONING_PHRASES.some((p) => low.includes(p)) ||
    /^(okay,?\s+|hmm,?\s+|so,?\s+|alright,?\s+|well,?\s+|wait,?\s+)?(the user\b|the person\b|let me\b|i need to\b|i should\b|i'll\b|i will\b|first,\s*i\b|they said\b|looking back\b|re-?reading\b|this (is|seems)\b)/i.test(low)
  ) {
    return true;
  }
  // Numbered analysis outline ("1. **Analyze ...", "2. **Strategy ...").
  if (/^\s*\d+\.\s*\*\*(analyze|analysis|persona|strategy|draft|reasoning|thought|input)/i.test(t)) {
    return true;
  }
  // Several meta phrases co-occurring — legit 1-2 sentence replies never do.
  const hits = [
    'the user', 'the conversation', 'the rules', 'the history',
    'i should', 'i need to', 'let me', 'respond', 'reply',
    'greeting', 'earlier', 'greeted',
  ].filter((p) => low.includes(p)).length;
  return hits >= 4;
}

/** Personality-flavoured, 1-2 sentence fallback for when Nemotron is offline. */
const OFFLINE_OPENER: Record<SagePersonality, string> = {
  bee: 'We got this though — ',
  cat: 'Lowkey though — ',
  bunny: "Hey, you're good — ",
  ladybug: 'Real talk — ',
};

function offlineReply(message: string): string {
  const m = message.toLowerCase();
  if (/(anxious|stressed|overwhelm|so much|where.*start|panick)/.test(m)) {
    return "You're fine. We don't gotta figure everything out right now — what's bugging you most?";
  }
  if (/(finish|finished|done|completed|did it|passed)/.test(m)) {
    return 'AYOOO big W!! Look at you being productive and stuff.';
  }
  if (/(don'?t wanna|can'?t focus|procrastinat|distract|lazy)/.test(m)) {
    return 'Valid, but future you is gonna be so mad at us 💀. Five minutes, deal?';
  }
  if (/(bored)/.test(m)) {
    return 'Valid. Are we productive bored or chaotic bored?';
  }
  if (/(plan|organize|todo|task|study|work)/.test(m)) {
    return "Say less. Let's pick the easiest win and build from there.";
  }
  const opener = OFFLINE_OPENER[getSagePersonality()];
  return `${opener}I'm running on local vibes right now, but I'm still here. What's on your mind?`;
}

/**
 * Home-assistant conversation: persisted history, Nemotron via POST /api/chat,
 * timeout + offline fallback. One in-flight request at a time.
 */
export function useSageChat() {
  // Every page load starts a fresh session (no stale display, no flash).
  // The previous log is archived on mount — stored history is preserved.
  const [messages, setMessages] = useState<SageChatMessage[]>([]);
  const [status, setStatus] = useState<SageChatStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const sessionIdRef = useRef(0);
  const messagesRef = useRef<SageChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Runs before the persist effect below (declaration order): archive the
  // previous session's stored log, then let persistence track the fresh one.
  useEffect(() => {
    if (didArchiveOnMount) return;
    didArchiveOnMount = true;
    const prev = loadHistory();
    if (prev.length > 0) archiveSession(prev);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify(messages.slice(-MAX_STORED).map(({ role, content }) => ({ role, content }))),
      );
    } catch {
      /* storage unavailable */
    }
  }, [messages]);

  /** Reset to the initial Home chat state (React state only — nothing reloaded). */
  const startNewSession = useCallback(() => {
    sessionIdRef.current += 1;
    inFlightRef.current = false;
    const prev = messagesRef.current;
    if (prev.length > 0) archiveSession(prev);
    messagesRef.current = [];
    setMessages([]);
    setError(null);
    setStatus('idle');
  }, []);

  const send = useCallback(async (text: string): Promise<string | null> => {
    const message = text.trim();
    if (!message || inFlightRef.current) return null;
    inFlightRef.current = true;
    const sessionId = sessionIdRef.current;
    setStatus('thinking');
    setError(null);
    const userMsg: SageChatMessage = { id: nid(), role: 'user', content: message };
    setMessages((prev) => [...prev.slice(-MAX_STORED + 2), userMsg]);

    const history = [...messages.slice(-8).map(({ role, content }) => ({ role, content }))];
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const data = await api.chatWithSignal('idle', message, history, controller.signal);
      if (sessionIdRef.current !== sessionId) return null; // session reset mid-flight
      let reply = (data.reply ?? '').trim();
      if (!reply || looksLikeReasoning(reply)) {
        reply = offlineReply(message);
      }
      setMessages((prev) => [...prev.slice(-MAX_STORED + 1), { id: nid(), role: 'assistant', content: reply }]);
      setStatus('idle');
      return reply;
    } catch {
      if (sessionIdRef.current !== sessionId) return null; // session reset mid-flight
      const reply = offlineReply(message);
      setMessages((prev) => [...prev.slice(-MAX_STORED + 1), { id: nid(), role: 'assistant', content: reply }]);
      setError('Sage is offline — local replies for now.');
      setStatus('error');
      return reply;
    } finally {
      window.clearTimeout(timer);
      inFlightRef.current = false;
    }
  }, [messages]);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
    setStatus('idle');
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
      /* noop */
    }
  }, []);

  return { messages, status, error, send, clear, startNewSession };
}
