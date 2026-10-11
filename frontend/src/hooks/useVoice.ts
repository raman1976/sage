import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: unknown) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SRConstructor = new () => SpeechRecognitionInstance;

const getSRConstructor = (): SRConstructor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  const ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return (ctor as SRConstructor) ?? null;
};

const readError = (e: unknown): string => {
  if (typeof e === 'object' && e !== null && 'error' in e) {
    const err = (e as { error?: unknown }).error;
    return typeof err === 'string' ? err : 'unknown';
  }
  return 'unknown';
};

const readTranscript = (e: unknown): string => {
  try {
    const evt = e as { results?: ArrayLike<ArrayLike<{ transcript?: string }>> };
    const text = evt?.results?.[0]?.[0]?.transcript;
    return typeof text === 'string' ? text.trim() : '';
  } catch {
    return '';
  }
};

/**
 * Browser-only voice: speech-to-text via SpeechRecognition (user-gated),
 * text-to-speech via speechSynthesis. No paid APIs, no keys.
 */
export function useVoice() {
  const [sttSupported] = useState(() => getSRConstructor() !== null);
  const [ttsSupported] = useState(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window,
  );
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [sttError, setSttError] = useState<string | null>(null);
  const recogRef = useRef<SpeechRecognitionInstance | null>(null);
  const resultCbRef = useRef<((text: string) => void) | null>(null);

  const stopListening = useCallback(() => {
    try {
      recogRef.current?.stop();
    } catch {
      /* already stopped */
    }
    recogRef.current = null;
    setListening(false);
  }, []);

  const startListening = useCallback(
    (onResult: (text: string) => void) => {
      const Ctor = getSRConstructor();
      if (!Ctor) {
        setSttError("Voice input isn't supported in this browser — typing works fully.");
        return;
      }
      try {
        try {
          recogRef.current?.abort();
        } catch {
          /* nothing active */
        }
        const rec = new Ctor();
        rec.lang = 'en-US';
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        resultCbRef.current = onResult;
        setSttError(null);
        rec.onresult = (e: unknown) => {
          const text = readTranscript(e);
          if (text) resultCbRef.current?.(text);
        };
        rec.onerror = (e: unknown) => {
          const err = readError(e);
          if (err === 'not-allowed' || err === 'service-not-allowed') {
            setSttError(
              'Microphone is blocked — allow mic access in browser settings, or just type instead.',
            );
          } else if (err === 'no-speech') {
            setSttError("I didn't catch that — try again, or type instead.");
          } else if (err === 'aborted') {
            setSttError(null);
          } else {
            setSttError('Voice input hiccup — typing works fully.');
          }
          setListening(false);
        };
        rec.onend = () => {
          setListening(false);
          recogRef.current = null;
        };
        recogRef.current = rec;
        rec.start();
        setListening(true);
      } catch {
        setSttError("Couldn't start the microphone — typing works fully.");
        setListening(false);
      }
    },
    [],
  );

  const stopSpeaking = useCallback(() => {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* no synthesis */
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!ttsSupported || typeof window === 'undefined') return;
      try {
        const synth = window.speechSynthesis;
        synth.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.95;
        utter.pitch = 1;
        utter.onend = () => setSpeaking(false);
        utter.onerror = () => setSpeaking(false);
        setSpeaking(true);
        synth.speak(utter);
      } catch {
        setSpeaking(false);
      }
    },
    [ttsSupported],
  );

  useEffect(
    () => () => {
      try {
        recogRef.current?.abort();
      } catch {
        /* noop */
      }
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* noop */
      }
    },
    [],
  );

  return {
    sttSupported,
    ttsSupported,
    listening,
    speaking,
    voiceOn,
    sttError,
    setVoiceOn,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
