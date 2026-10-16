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

export interface SageVoiceInfo {
  voiceURI: string;
  name: string;
  lang: string;
}

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

/* ------------------------- TTS provider (modular) ------------------------- */
/** Swap this for a server-side TTS provider later without touching callers. */
export interface TtsProvider {
  speak: (text: string, opts: { voiceURI: string | null; rate: number; onend: () => void }) => void;
  cancel: () => void;
}

const MALE_NAME_HINTS = /(male|david|daniel|alex|fred|aaron|nathan|ryan|justin|christopher|tom\b|mark\b|paul\b|george|james|john|mike|sam\b|guy|google us english)/i;

/** Pick the best en-US male voice; fall back gracefully. Returns null when none. */
export function pickDefaultVoice(voices: SageVoiceInfo[]): SageVoiceInfo | null {
  if (voices.length === 0) return null;
  const enUS = voices.filter((v) => v.lang.toLowerCase().startsWith('en-us'));
  const pool = enUS.length > 0 ? enUS : voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const base = pool.length > 0 ? pool : voices;
  return base.find((v) => MALE_NAME_HINTS.test(v.name)) ?? base[0] ?? null;
}

const PREF_VOICE_URI = 'sage_voice_uri';
const PREF_RATE = 'sage_voice_rate';
const PREF_VOICE_ON = 'sage_voice_on';
const PREF_AUTOSPEAK = 'sage_voice_autospeak';

const readPref = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writePref = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
};

/**
 * Browser voice engine: speech-to-text via SpeechRecognition (user-gated),
 * text-to-speech via speechSynthesis. No keys in the frontend.
 * Speak through the `speak`/`previewVoice` functions so a server-side
 * TtsProvider can replace the browser implementation later.
 */
export function useVoice() {
  const [sttSupported] = useState(() => getSRConstructor() !== null);
  const [ttsSupported] = useState(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window,
  );
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceOn, setVoiceOnState] = useState(() => readPref(PREF_VOICE_ON) !== 'off');
  const [autoSpeak, setAutoSpeakState] = useState(() => readPref(PREF_AUTOSPEAK) !== 'off');
  const [rate, setRateState] = useState(() => {
    const raw = parseFloat(readPref(PREF_RATE) ?? '');
    return Number.isFinite(raw) ? Math.min(2, Math.max(0.5, raw)) : 1.0;
  });
  const [voices, setVoices] = useState<SageVoiceInfo[]>([]);
  const [voiceURI, setVoiceURIState] = useState<string | null>(() => readPref(PREF_VOICE_URI));
  const [sttError, setSttError] = useState<string | null>(null);
  const recogRef = useRef<SpeechRecognitionInstance | null>(null);
  const resultCbRef = useRef<((text: string) => void) | null>(null);
  const sessionRef = useRef(0);
  const voiceURIRef = useRef<string | null>(readPref(PREF_VOICE_URI));
  const rateRef = useRef(rate);

  /* ---- async voice loading (Chrome/Safari populate voices lazily) ---- */
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const load = () => {
      try {
        const list = window.speechSynthesis.getVoices().map((v) => ({
          voiceURI: v.voiceURI,
          name: v.name,
          lang: v.lang,
        }));
        if (list.length > 0) setVoices(list);
      } catch {
        /* ignore */
      }
    };
    load();
    try {
      window.speechSynthesis.onvoiceschanged = load;
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(load, 800);
    return () => {
      window.clearTimeout(t);
      try {
        window.speechSynthesis.onvoiceschanged = null;
      } catch {
        /* ignore */
      }
    };
  }, []);

  /* ---- fall back to the saved/default voice once voices arrive ---- */
  useEffect(() => {
    if (voices.length === 0) return;
    const saved = readPref(PREF_VOICE_URI);
    if (saved && voices.some((v) => v.voiceURI === saved)) {
      voiceURIRef.current = saved;
      setVoiceURIState(saved);
      return;
    }
    if (!voiceURIRef.current) {
      const best = pickDefaultVoice(voices);
      if (best) {
        voiceURIRef.current = best.voiceURI;
        setVoiceURIState(best.voiceURI);
      }
    }
  }, [voices]);

  const setVoiceOn = useCallback((on: boolean) => {
    setVoiceOnState(on);
    writePref(PREF_VOICE_ON, on ? 'on' : 'off');
    if (!on) {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* noop */
      }
    }
  }, []);

  const setAutoSpeak = useCallback((on: boolean) => {
    setAutoSpeakState(on);
    writePref(PREF_AUTOSPEAK, on ? 'on' : 'off');
  }, []);

  const setRate = useCallback((r: number) => {
    const clamped = Math.min(2, Math.max(0.5, r));
    rateRef.current = clamped;
    setRateState(clamped);
    writePref(PREF_RATE, String(clamped));
  }, []);

  const setVoiceURI = useCallback((uri: string | null) => {
    voiceURIRef.current = uri;
    setVoiceURIState(uri);
    if (uri) writePref(PREF_VOICE_URI, uri);
  }, []);

  const stopListening = useCallback(() => {
    sessionRef.current += 1;
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
      // Prevent duplicate sessions: a toggle while listening just stops.
      if (recogRef.current) {
        try {
          recogRef.current.stop();
        } catch {
          /* noop */
        }
        return;
      }
      try {
        const rec = new Ctor();
        const session = sessionRef.current + 1;
        sessionRef.current = session;
        rec.lang = 'en-US';
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        resultCbRef.current = onResult;
        setSttError(null);
        rec.onresult = (e: unknown) => {
          if (sessionRef.current !== session) return;
          const text = readTranscript(e);
          if (text) resultCbRef.current?.(text);
        };
        rec.onerror = (e: unknown) => {
          if (sessionRef.current !== session) return;
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
          if (sessionRef.current !== session) return;
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
    (text: string, opts?: { voiceURI?: string | null; rate?: number }) => {
      if (!ttsSupported || typeof window === 'undefined') return;
      const clean = text.trim().slice(0, 600);
      if (!clean) return;
      try {
        const synth = window.speechSynthesis;
        synth.cancel();
        const utter = new SpeechSynthesisUtterance(clean);
        const uri = opts?.voiceURI ?? voiceURIRef.current;
        try {
          const match = synth.getVoices().find((v) => v.voiceURI === uri);
          if (match) utter.voice = match;
        } catch {
          /* default voice */
        }
        utter.rate = opts?.rate ?? rateRef.current;
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

  const previewVoice = useCallback(
    (uri?: string | null, r?: number) => {
      speak('Hey, I am Sage. We got this.', { voiceURI: uri ?? voiceURIRef.current, rate: r ?? rateRef.current });
    },
    [speak],
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
    autoSpeak,
    rate,
    voices,
    voiceURI: voiceURI ?? voiceURIRef.current,
    sttError,
    setVoiceOn,
    setAutoSpeak,
    setRate,
    setVoiceURI,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    previewVoice,
  };
}
