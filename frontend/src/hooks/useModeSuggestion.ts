import { useCallback, useRef, useState } from 'react';
import { api } from '../services/api';

export type SuggestedMode = 'calm' | 'focus' | 'companion' | 'plan';

export interface PendingSuggestion {
  mode: SuggestedMode;
  /** Last user message — handed to the destination mode as entry context. */
  context: string;
  askLine: string;
}

const COOLDOWN_MESSAGES = 8;
const SUGGEST_TIMEOUT_MS = 15000;
const MIN_MESSAGE_LEN = 4;

const ASK_LINES: Record<SuggestedMode, string[]> = {
  calm: [
    'Okay, sounds like your brain has 37 tabs open 😭 Wanna try Calm mode?',
    'That sounds like a lot all at once. Want me to walk you through Calm mode?',
  ],
  focus: [
    'Sounds like something deserves your full attention. Wanna start a Focus session?',
    'We could totally lock in on this. Want to try Focus mode?',
  ],
  companion: [
    'Want to think this through together? Companion mode is good for that.',
    'I can rubber-duck this with you — wanna hop into Companion mode?',
  ],
  plan: [
    'This feels like a break-it-down situation. Wanna try Plan mode?',
    'We got this — want me to split it into small steps in Plan mode?',
  ],
};

const MODE_LABELS: Record<SuggestedMode, string> = {
  calm: 'Calm',
  focus: 'Focus',
  companion: 'Companion',
  plan: 'Plan',
};

const AFFIRM_RE = /^(yes|yeah|yep|yup|sure|ok|okay|k|please|definitely|absolutely|of course|let'?s (do it|go)|sounds good|go ahead|do it|try it|i'?m in|why not)\b/i;
const DECLINE_RE = /^(no|nope|nah|not really|i'?m good|maybe later|not now|pass|i'?ll stay|stay here|not yet)\b/i;

/** Short user reply that confirms / declines a pending suggestion, else null. */
export function matchConfirmation(text: string): 'yes' | 'no' | null {
  const t = text.trim().toLowerCase().replace(/[.!…]+$/, '');
  if (t.length === 0 || t.length > 40) return null;
  if (AFFIRM_RE.test(t)) return 'yes';
  if (DECLINE_RE.test(t)) return 'no';
  return null;
}

/**
 * Proactive mode suggestions driven by Nemotron (never keyword rules).
 * Owns the pending suggestion, per-mode decline cooldowns, and the
 * fire-and-forget classifier call. Navigation stays with the caller so
 * nothing ever switches without explicit confirmation.
 */
export function useModeSuggestion() {
  const [suggestion, setSuggestion] = useState<PendingSuggestion | null>(null);
  const declinedRef = useRef<Record<string, number>>({});
  const userMsgCountRef = useRef(0);
  const inFlightRef = useRef(false);
  const askIndexRef = useRef(0);

  const noteUserMessage = useCallback(() => {
    userMsgCountRef.current += 1;
  }, []);

  const maybeSuggest = useCallback(
    async (
      history: Array<{ role: 'user' | 'assistant'; content: string }>,
      context: string,
    ): Promise<void> => {
      if (suggestion || inFlightRef.current) return;
      if (context.trim().length < MIN_MESSAGE_LEN) return;
      inFlightRef.current = true;
      try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), SUGGEST_TIMEOUT_MS);
        try {
          const { mode } = await api.suggestMode(history.slice(-8), controller.signal);
          if (
            mode &&
            (mode === 'calm' || mode === 'focus' || mode === 'companion' || mode === 'plan')
          ) {
            const declinedAt = declinedRef.current[mode] ?? -Infinity;
            if (userMsgCountRef.current - declinedAt >= COOLDOWN_MESSAGES) {
              const lines = ASK_LINES[mode];
              askIndexRef.current += 1;
              setSuggestion({
                mode,
                context: context.trim().slice(0, 300),
                askLine: lines[askIndexRef.current % lines.length],
              });
            }
          }
        } finally {
          window.clearTimeout(timer);
        }
      } catch {
        /* suggestion unavailable — ordinary chat continues untouched */
      } finally {
        inFlightRef.current = false;
      }
    },
    [suggestion],
  );

  /** Confirm and take the suggestion (caller navigates). */
  const takeSuggestion = useCallback((): PendingSuggestion | null => {
    if (!suggestion) return null;
    const taken = suggestion;
    setSuggestion(null);
    return taken;
  }, [suggestion]);

  /** Decline: dismiss + start cooldown so we don't nag about this mode. */
  const declineSuggestion = useCallback(() => {
    setSuggestion((prev) => {
      if (prev) declinedRef.current[prev.mode] = userMsgCountRef.current;
      return null;
    });
  }, []);

  const clearSuggestion = useCallback(() => {
    setSuggestion(null);
  }, []);

  return {
    suggestion,
    maybeSuggest,
    takeSuggestion,
    declineSuggestion,
    clearSuggestion,
    noteUserMessage,
    modeLabel: (mode: SuggestedMode) => MODE_LABELS[mode],
  };
}
