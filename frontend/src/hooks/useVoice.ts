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

/** Concatenate only final (committed) results — interim partials return ''. */
const readFinalTranscript = (e: unknown): string => {
  try {
    const evt = e as {
      results?: ArrayLike<{ isFinal?: boolean } & ArrayLike<{ transcript?: string }>>;
      resultIndex?: number;
    };
    const results = evt?.results;
    if (!results) return '';
    const from = typeof evt.resultIndex === 'number' ? evt.resultIndex : 0;
    let out = '';
    for (let i = from; i < results.length; i++) {
      const r = results[i];
      if (r && (r as { isFinal?: boolean }).isFinal) {
        const t = (r as ArrayLike<{ transcript?: string }>)[0]?.transcript;
        if (typeof t === 'string') out += ` ${t}`;
      }
    }
    return out.trim();
  } catch {
    return '';
  }
};

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/* Echo window: transcripts matching our own TTS only count right after speech. */
const ECHO_WINDOW_MS = 4000;

const normalizeEchoText = (t: string): string =>
  t.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/** True when the transcript is almost certainly our own speaker output. */
const isEchoTranscription = (transcript: string, spoken: string): boolean => {
  const t = normalizeEchoText(transcript);
  const s = normalizeEchoText(spoken);
  if (!t || !s) return false;
  if (s.includes(t) || t.includes(s)) return true;
  const tWords = t.split(' ');
  const sWords = new Set(s.split(' '));
  let hit = 0;
  tWords.forEach((w) => {
    if (sWords.has(w)) hit += 1;
  });
  return tWords.length > 0 && hit / tWords.length >= 0.6;
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
  // Timers for the in-flight TTS utterance (resume-nudge + safety unstick +
  // the delayed speak that works around the Windows Chrome cancel bug).
  const speakTimersRef = useRef<{ safety: number | null; resume: number | null; delayed: number | null }>({
    safety: null,
    resume: null,
    delayed: null,
  });

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
    // Also exits continuous mode (superset: any manual stop ends the loop).
    const c = contRef.current;
    c.active = false;
    c.runId += 1;
    if (c.silenceTimer !== null) {
      window.clearTimeout(c.silenceTimer);
      c.silenceTimer = null;
    }
    try {
      recogRef.current?.stop();
    } catch {
      /* already stopped */
    }
    recogRef.current = null;
    setListening(false);
    setContinuous(false);
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
    // Clear any pending TTS timers so a delayed utterance can't fire late.
    const t = speakTimersRef.current;
    if (t.safety !== null) { window.clearTimeout(t.safety); t.safety = null; }
    if (t.resume !== null) { window.clearInterval(t.resume); t.resume = null; }
    if (t.delayed !== null) { window.clearTimeout(t.delayed); t.delayed = null; }
    setSpeaking(false);
    speechEndAtRef.current = 0;
  }, []);

  const finishSpeak = useCallback(() => {
    const t = speakTimersRef.current;
    if (t.safety !== null) { window.clearTimeout(t.safety); t.safety = null; }
    if (t.resume !== null) { window.clearInterval(t.resume); t.resume = null; }
    setSpeaking(false);
    speechEndAtRef.current = Date.now();
  }, []);

  const speak = useCallback(
    (text: string, opts?: { voiceURI?: string | null; rate?: number }) => {
      if (!ttsSupported || typeof window === 'undefined') return;
      const clean = text.trim().slice(0, 600);
      if (!clean) return;
      const synth = window.speechSynthesis;
      const t = speakTimersRef.current;

      const doSpeak = () => {
        t.delayed = null;
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
        utter.onend = finishSpeak;
        utter.onerror = finishSpeak;
        // Chrome/Safari can stall long utterances (~15s) — nudge with resume.
        if (t.resume !== null) window.clearInterval(t.resume);
        t.resume = window.setInterval(() => {
          try { if (synth.speaking) synth.resume(); } catch { /* noop */ }
        }, 8000);
        // Safety: never leave `speaking` stuck true if onend/onerror never fire.
        if (t.safety !== null) window.clearTimeout(t.safety);
        t.safety = window.setTimeout(finishSpeak, 120000);
        setSpeaking(true);
        lastSpokenRef.current = clean;
        try { synth.speak(utter); } catch { finishSpeak(); }
      };

      try {
        // Clear any prior utterance's timers so they can't fire on this one.
        if (t.safety !== null) { window.clearTimeout(t.safety); t.safety = null; }
        if (t.resume !== null) { window.clearInterval(t.resume); t.resume = null; }
        // Windows Chrome bug: cancel() + speak() in the same tick = silent
        // output (cancel flushes async and kills the fresh utterance). Only
        // cancel when something is actually active, then give it a tick.
        if (synth.speaking || synth.pending) {
          synth.cancel();
          if (t.delayed !== null) window.clearTimeout(t.delayed);
          t.delayed = window.setTimeout(doSpeak, 80);
        } else {
          doSpeak();
        }
      } catch {
        finishSpeak();
      }
    },
    [ttsSupported, finishSpeak],
  );

  const previewVoice = useCallback(
    (uri?: string | null, r?: number) => {
      speak('Hey, I am Sage. We got this.', { voiceURI: uri ?? voiceURIRef.current, rate: r ?? rateRef.current });
    },
    [speak],
  );

  /* ------------------- continuous hands-free conversation ------------------- */
  const SILENCE_EXIT_MS = 5000;
  const MAX_AUTO_RESTARTS = 25;
  const [continuous, setContinuous] = useState(false);
  const speakingRef = useRef(false);
  useEffect(() => {
    speakingRef.current = speaking;
  }, [speaking]);
  // What Sage last said out loud + when it finished (echo detection).
  const lastSpokenRef = useRef('');
  const speechEndAtRef = useRef(0);
  const contRef = useRef<{
    active: boolean;
    runId: number;
    recToken: number;
    phase: 'listening' | 'processing';
    onFinal: ((text: string) => void | Promise<void>) | null;
    silenceTimer: number | null;
    restarts: number;
    handledFinal: boolean;
    echoDrops: number;
  }>({ active: false, runId: 0, recToken: 0, phase: 'listening', onFinal: null, silenceTimer: null, restarts: 0, handledFinal: false, echoDrops: 0 });

  const clearSilenceTimer = useCallback(() => {
    if (contRef.current.silenceTimer !== null) {
      window.clearTimeout(contRef.current.silenceTimer);
      contRef.current.silenceTimer = null;
    }
  }, []);

  const stopRecog = useCallback(() => {
    try {
      recogRef.current?.stop();
    } catch {
      /* already stopped */
    }
    recogRef.current = null;
    setListening(false);
  }, []);

  /** Full stop of the continuous loop (manual toggle or silence timeout). */
  const stopContinuous = useCallback(() => {
    const c = contRef.current;
    c.active = false;
    c.runId += 1;
    c.onFinal = null;
    c.echoDrops = 0;
    if (c.silenceTimer !== null) {
      window.clearTimeout(c.silenceTimer);
      c.silenceTimer = null;
    }
    stopRecog();
    setContinuous(false);
  }, [stopRecog]);

  const armSilenceTimer = useCallback(() => {
    const c = contRef.current;
    if (c.silenceTimer !== null) window.clearTimeout(c.silenceTimer);
    c.silenceTimer = window.setTimeout(() => {
      // 5s with no detected speech — exit voice mode entirely.
      stopContinuous();
    }, SILENCE_EXIT_MS);
  }, [stopContinuous]);

  const startContRecog = useCallback(() => {
    const c = contRef.current;
    if (!c.active) return;
    const Ctor = getSRConstructor();
    if (!Ctor) {
      setSttError("Voice input isn't supported in this browser — typing works fully.");
      stopContinuous();
      return;
    }
    try {
      const rec = new Ctor();
      const runId = c.runId;
      c.recToken += 1;
      const token = c.recToken;
      rec.lang = 'en-US';
      rec.interimResults = true; // partials reset the silence timer
      rec.maxAlternatives = 1;
      c.handledFinal = false;
      const alive = () =>
        contRef.current.active &&
        contRef.current.runId === runId &&
        contRef.current.recToken === token;
      rec.onresult = (e: unknown) => {
        if (!alive()) return;
        // Any speech (partial or final) resets the 5s silence window.
        armSilenceTimer();
        contRef.current.restarts = 0;
        const text = readFinalTranscript(e);
        if (text && !contRef.current.handledFinal && contRef.current.phase === 'listening') {
          // Drop our own speaker echo: a TTS tail transcribed right after
          // speech ends must never become a user message.
          if (
            speechEndAtRef.current > 0 &&
            Date.now() - speechEndAtRef.current < ECHO_WINDOW_MS &&
            isEchoTranscription(text, lastSpokenRef.current)
          ) {
            contRef.current.echoDrops += 1;
            if (contRef.current.echoDrops >= 3) {
              stopContinuous(); // feedback-loop breaker
              return;
            }
            // Skip this utterance but keep listening.
            stopRecog();
            if (contRef.current.active && contRef.current.runId === runId) {
              contRef.current.phase = 'listening';
              startContRecog();
              armSilenceTimer();
            }
            return;
          }
          contRef.current.echoDrops = 0;
          contRef.current.handledFinal = true;
          contRef.current.phase = 'processing';
          clearSilenceTimer(); // processing/speaking time doesn't count
          const cb = contRef.current.onFinal;
          stopRecog(); // mic off before any TTS — never hear ourselves
          void (async () => {
            try {
              await cb?.(text);
            } catch {
              /* per-site handlers own their errors */
            }
            // Turn-taking pause (lets any TTS tail fully die), then resume
            // once Sage is done speaking.
            await sleep(1200);
            const t0 = Date.now();
            while (contRef.current.active && contRef.current.runId === runId) {
              if (!speakingRef.current) break;
              if (Date.now() - t0 > 90000) break;
              await sleep(250);
            }
            const cur = contRef.current;
            if (!cur.active || cur.runId !== runId) return;
            cur.phase = 'listening';
            startContRecog();
            armSilenceTimer();
          })();
        }
      };
      rec.onerror = (e: unknown) => {
        if (!alive()) return;
        const err = readError(e);
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          setSttError('Microphone is blocked — allow mic access in browser settings, or just type instead.');
          stopContinuous();
        } else if (err === 'aborted') {
          /* our own stop — ignore */
        } else if (contRef.current.phase === 'listening' && contRef.current.restarts < MAX_AUTO_RESTARTS) {
          // Transient error (incl. timeouts): restart, silence timer still governs exit.
          contRef.current.restarts += 1;
          try {
            recogRef.current = null;
            startContRecog();
          } catch {
            /* next cycle will retry */
          }
        }
        // 'no-speech' and friends: do nothing — the silence timer decides.
      };
      rec.onend = () => {
        if (!alive()) return;
        // Browser ended the session mid-listen (timeouts): restart it.
        if (contRef.current.phase === 'listening' && contRef.current.restarts < MAX_AUTO_RESTARTS) {
          contRef.current.restarts += 1;
          recogRef.current = null;
          startContRecog();
        }
      };
      recogRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setSttError("Couldn't start the microphone — typing works fully.");
      stopContinuous();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armSilenceTimer, clearSilenceTimer, stopContinuous, stopRecog]);

  /**
   * Enter continuous hands-free mode. `onFinal` runs per finished utterance
   * (existing per-site send/speak logic); listening auto-resumes after it
   * completes and any speech ends. 5s of silence exits. Manual toggle stops.
   */
  const startContinuous = useCallback(
    (onFinal: (text: string) => void | Promise<void>) => {
      const Ctor = getSRConstructor();
      if (!Ctor) {
        setSttError("Voice input isn't supported in this browser — typing works fully.");
        return;
      }
      if (contRef.current.active) return; // already looping — no duplicates
      try {
        window.speechSynthesis?.cancel(); // never listen to our own voice
      } catch {
        /* noop */
      }
      setSpeaking(false);
      setSttError(null);
      const c = contRef.current;
      c.active = true;
      c.runId += 1;
      c.phase = 'listening';
      c.onFinal = onFinal;
      c.restarts = 0;
      c.echoDrops = 0;
      setContinuous(true);
      startContRecog();
      armSilenceTimer();
    },
    [armSilenceTimer, startContRecog],
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
    continuous,
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
    startContinuous,
    stopContinuous,
    speak,
    stopSpeaking,
    previewVoice,
  };
}
