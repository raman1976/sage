import { useCallback, useEffect, useRef, useState } from 'react';
import type { SageMode } from '../types';

/* ----------------------------- track mapping ----------------------------- */

interface TrackInfo {
  src: string;
  title: string;
  modeLabel: string;
}

export const TRACKS: Record<string, TrackInfo> = {
  idle:       { src: '/audio/sage_ambient.mp3',   title: 'Dreamy Skies',    modeLabel: 'Ambient' },
  companion:  { src: '/audio/sage_companion.mp3', title: 'Gentle Thoughts', modeLabel: 'Companion' },
  focus:      { src: '/audio/sage_focus.mp3',     title: 'Deep Currents',   modeLabel: 'Focus' },
  calm:       { src: '/audio/sage_calm.mp3',      title: 'Moonlit Calm',    modeLabel: 'Calm' },
  plan:       { src: '/audio/sage_plan.mp3',      title: 'Stardust Steps',  modeLabel: 'Plan' },
};

const FALLBACK: TrackInfo = TRACKS.idle;

const trackForMode = (mode: SageMode): TrackInfo =>
  TRACKS[mode] ?? FALLBACK;

/* ------------------------------ preferences ------------------------------ */

const PREF_VOLUME = 'sage_music_volume';
const PREF_ENABLED = 'sage_music_enabled';

const readVolume = (): number => {
  try {
    const v = localStorage.getItem(PREF_VOLUME);
    if (v !== null) {
      const n = parseFloat(v);
      if (!Number.isNaN(n) && n >= 0 && n <= 1) return n;
    }
  } catch { /* private mode */ }
  return 0.2;
};

const readEnabled = (): boolean => {
  try {
    return localStorage.getItem(PREF_ENABLED) === 'true';
  } catch { /* private mode */ }
  return false;
};

const writePref = (key: string, val: string) => {
  try { localStorage.setItem(key, val); } catch { /* private mode */ }
};

/* ---------------------------- format helpers ----------------------------- */

export const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/* ------------------------------ hook state -------------------------------- */

export interface MusicPlayerState {
  playing: boolean;
  muted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  track: TrackInfo;
  mode: SageMode;
  musicEnabled: boolean;
  error: string | null;
}

export interface MusicPlayerActions {
  togglePlay: () => void;
  toggleMute: () => void;
  setVolume: (v: number) => void;
  seek: (fraction: number) => void;
  duckVolume: (duck: boolean) => void;
}

export function useMusicPlayer(mode: SageMode): MusicPlayerState & MusicPlayerActions {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);
  const modeRef = useRef<SageMode>(mode);

  const [state, setState] = useState<MusicPlayerState>(() => ({
    playing: false,
    muted: false,
    volume: readVolume(),
    currentTime: 0,
    duration: 0,
    track: trackForMode(mode),
    mode,
    musicEnabled: readEnabled(),
    error: null,
  }));

  /* -------- create the single Audio element once -------- */
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = state.volume;
    audioRef.current = audio;

    const onTime = () => setState(s => ({ ...s, currentTime: audio.currentTime }));
    const onDur  = () => setState(s => ({ ...s, duration: audio.duration || 0 }));
    const onPlay = () => setState(s => ({ ...s, playing: true }));
    const onPause = () => setState(s => ({ ...s, playing: false }));
    const onEnd = () => setState(s => ({ ...s, playing: false }));
    const onErr = () => setState(s => ({ ...s, error: 'Audio file unavailable', playing: false }));
    const onVol = () => setState(s => ({ ...s, volume: audio.volume, muted: audio.muted }));

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('durationchange', onDur);
    audio.addEventListener('loadedmetadata', onDur);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('error', onErr);
    audio.addEventListener('volumechange', onVol);

    return () => {
      if (fadeRef.current) window.clearInterval(fadeRef.current);
      audio.pause();
      audio.src = '';
      audio.remove();
      audioRef.current = null;
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('durationchange', onDur);
      audio.removeEventListener('loadedmetadata', onDur);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('error', onErr);
      audio.removeEventListener('volumechange', onVol);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------- track switching with fade -------- */
  const switchTrack = useCallback((newMode: SageMode, wasPlaying: boolean, targetVolume: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const next = trackForMode(newMode);

    // Cancel any in-flight fade
    if (fadeRef.current) {
      window.clearInterval(fadeRef.current);
      fadeRef.current = null;
    }

    const doSwap = () => {
      if (fadeRef.current) {
        window.clearInterval(fadeRef.current);
        fadeRef.current = null;
      }
      audio.src = next.src;
      audio.load();
      audio.volume = targetVolume;
      setState(s => ({
        ...s,
        track: next,
        mode: newMode,
        currentTime: 0,
        duration: 0,
        error: null,
      }));
      if (wasPlaying) {
        audio.play().catch(() => {
          setState(s => ({ ...s, playing: false, musicEnabled: false }));
          writePref(PREF_ENABLED, 'false');
        });
      }
    };

    // Fade out, swap, fade back in
    const fadeSteps = 20;
    const fadeInterval = 50; // 20 * 50ms ≈ 1s
    const step = targetVolume / fadeSteps;
    let i = 0;
    fadeRef.current = window.setInterval(() => {
      i++;
      audio.volume = Math.max(0, targetVolume - step * i);
      if (i >= fadeSteps) {
        doSwap();
        // Fade in
        let j = 0;
        fadeRef.current = window.setInterval(() => {
          j++;
          audio.volume = Math.min(targetVolume, step * j);
          if (j >= fadeSteps) {
            if (fadeRef.current) {
              window.clearInterval(fadeRef.current);
              fadeRef.current = null;
            }
            audio.volume = targetVolume;
          }
        }, fadeInterval);
      }
    }, fadeInterval);
  }, []);

  /* -------- react to mode changes -------- */
  useEffect(() => {
    const prev = modeRef.current;
    if (prev === mode) return;
    modeRef.current = mode;

    const t = trackForMode(mode);
    setState(s => ({
      ...s,
      mode,
      track: t,
    }));

    if (state.musicEnabled) {
      switchTrack(mode, state.playing, state.muted ? 0 : state.volume);
    } else {
      // Just update the displayed track
      const audio = audioRef.current;
      if (audio) {
        audio.src = t.src;
        audio.load();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  /* -------- actions -------- */
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (state.playing) {
      audio.pause();
      writePref(PREF_ENABLED, 'false');
      setState(s => ({ ...s, musicEnabled: false }));
    } else {
      // Ensure correct src
      const t = trackForMode(state.mode);
      if (!audio.src || !audio.src.endsWith(t.src)) {
        audio.src = t.src;
        audio.load();
      }
      audio.volume = state.muted ? 0 : state.volume;
      audio.play().catch(() => {
        setState(s => ({ ...s, playing: false, musicEnabled: false, error: 'Playback was blocked' }));
        writePref(PREF_ENABLED, 'false');
      });
      writePref(PREF_ENABLED, 'true');
      setState(s => ({ ...s, musicEnabled: true, error: null }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.playing, state.mode, state.muted, state.volume]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !state.muted;
    audio.muted = next;
    audio.volume = next ? 0 : state.volume;
    setState(s => ({ ...s, muted: next }));
  }, [state.muted, state.volume]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    const audio = audioRef.current;
    if (audio) {
      audio.muted = false;
      audio.volume = clamped;
    }
    writePref(PREF_VOLUME, String(clamped));
    setState(s => ({ ...s, volume: clamped, muted: false }));
  }, []);

  const seek = useCallback((fraction: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    const time = fraction * audio.duration;
    audio.currentTime = time;
    setState(s => ({ ...s, currentTime: time }));
  }, []);

  /** Temporarily duck volume for voice (TTS/STT). Restores after. */
  const duckVolume = useCallback((duck: boolean) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (duck) {
      audio.volume = Math.max(0, state.volume * 0.15);
    } else {
      audio.volume = state.muted ? 0 : state.volume;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.volume, state.muted]);

  return {
    ...state,
    togglePlay,
    toggleMute,
    setVolume,
    seek,
    duckVolume,
  };
}
