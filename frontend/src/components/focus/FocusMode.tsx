import { useCallback, useEffect, useRef, useState } from 'react';
import type { SageExpression } from '../../types';
import { useVoice } from '../../hooks/useVoice';

interface FocusModeProps {
  onExit: () => void;
  onExpressionChange: (expr: SageExpression | null) => void;
  initialTask?: string | null;
  onConsumeInitialTask?: () => void;
}

interface Bookmark {
  id: string;
  task: string;
  progress: string;
  nextStep: string;
  savedAt: number;
}

interface Parked {
  id: string;
  text: string;
  savedAt: number;
}

interface FocusStore {
  bookmarks: Bookmark[];
  parked: Parked[];
  queue: string[];
}

const STORE_KEY = 'sage-focus';

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border-color)',
  borderRadius: 'clamp(14px, 3vw, 20px)',
  padding: 'clamp(10px, 2.4vh, 14px) clamp(12px, 3vw, 16px)',
  boxSizing: 'border-box',
};

const pill: React.CSSProperties = {
  border: '1px solid var(--border-color)',
  borderRadius: '9999px',
  background: 'rgba(255,255,255,0.05)',
  color: 'var(--text-primary)',
  fontSize: 'clamp(12px, 2.8vw, 14px)',
  fontWeight: 600,
  fontFamily: 'system-ui, sans-serif',
  padding: 'clamp(8px, 2vh, 10px) clamp(14px, 3vw, 18px)',
  cursor: 'pointer',
  userSelect: 'none',
};

const primaryPill: React.CSSProperties = {
  ...pill,
  background: 'linear-gradient(135deg, var(--accent-primary) 0%, #9d85c7 100%)',
  border: '1px solid var(--accent-primary)',
  color: '#17171D',
};

const smallText: React.CSSProperties = {
  margin: 0,
  fontSize: 'clamp(12px, 2.8vw, 14px)',
  color: 'var(--text-secondary)',
  lineHeight: 1.45,
  fontFamily: 'system-ui, sans-serif',
};

const sageText: React.CSSProperties = {
  margin: 0,
  fontSize: 'clamp(14px, 3.2vw, 16px)',
  color: 'var(--text-primary)',
  lineHeight: 1.5,
  fontFamily: 'system-ui, sans-serif',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  alignItems: 'center',
};

const inputStyle: React.CSSProperties = {
  flex: '1 1 auto',
  minWidth: 0,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border-color)',
  borderRadius: 9999,
  color: 'var(--text-primary)',
  fontSize: 'clamp(13px, 3vw, 15px)',
  padding: '10px 16px',
  outline: 'none',
  fontFamily: 'system-ui, sans-serif',
  boxSizing: 'border-box',
};

const PRESETS = [5, 10, 15, 25];

function fmtClock(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function loadStore(): FocusStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { bookmarks: [], parked: [], queue: [] };
    const p = JSON.parse(raw) as Partial<FocusStore>;
    return {
      bookmarks: Array.isArray(p.bookmarks) ? p.bookmarks : [],
      parked: Array.isArray(p.parked) ? p.parked : [],
      queue: Array.isArray(p.queue) ? p.queue : [],
    };
  } catch {
    return { bookmarks: [], parked: [], queue: [] };
  }
}

let uid = 1;
const nid = (p: string) => `${p}-${Date.now()}-${uid++}`;

export const FocusMode = ({ onExit, onExpressionChange, initialTask, onConsumeInitialTask }: FocusModeProps) => {
  const voice = useVoice();
  const [task, setTask] = useState(initialTask ?? '');
  const [minutes, setMinutes] = useState(25);
  const [custom, setCustom] = useState('');
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(25 * 60);
  const [reminders, setReminders] = useState(true);
  const [note, setNote] = useState('Set a task and a duration. I’ll keep time while you focus.');
  const [finished, setFinished] = useState(false);
  const [parkDraft, setParkDraft] = useState('');
  const [progressNote, setProgressNote] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [store, setStore] = useState<FocusStore>(loadStore);
  const [tab, setTab] = useState<'timer' | 'park' | 'marks'>('timer');

  const endAtRef = useRef(0);
  const totalRef = useRef(25 * 60);
  const firedRef = useRef<Set<string>>(new Set());
  const consumedRef = useRef(false);

  useEffect(() => {
    onExpressionChange('happy');
    return () => onExpressionChange(null);
  }, [onExpressionChange]);
  useEffect(() => voice.stopSpeaking, [voice.stopSpeaking]);

  useEffect(() => {
    if (!consumedRef.current && initialTask) {
      consumedRef.current = true;
      setTask(initialTask);
      onConsumeInitialTask?.();
    }
  }, [initialTask, onConsumeInitialTask]);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {
      /* storage unavailable */
    }
  }, [store]);

  const speakIfOn = useCallback(
    (text: string) => {
      if (voice.voiceOn && voice.ttsSupported) voice.speak(text);
    },
    [voice],
  );

  /* Timestamp-based countdown: accurate even when the tab is backgrounded. */
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      const total = totalRef.current;
      const frac = total > 0 ? (total - left) / total : 0;
      if (reminders) {
        if (frac >= 0.5 && !firedRef.current.has('half')) {
          firedRef.current.add('half');
          const msg = 'Halfway through. Still here — stay with it gently.';
          setNote(msg);
          speakIfOn(msg);
        } else if (left <= 120 && left > 0 && total > 300 && !firedRef.current.has('two')) {
          firedRef.current.add('two');
          const msg = 'Two minutes left. Begin landing wherever you are.';
          setNote(msg);
          speakIfOn(msg);
        }
      }
      setRemaining(left);
      if (left <= 0) {
        window.clearInterval(id);
        setRunning(false);
        setFinished(true);
        const done = task.trim()
          ? `Session complete on “${task.trim()}”. Beautiful focus — I’m proud of you. 🌱`
          : 'Session complete. Beautiful focus — I’m proud of you. 🌱';
        setNote(done);
        onExpressionChange('happy');
        speakIfOn(done);
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [running, reminders, onExpressionChange, speakIfOn, task]);

  const resolveSeconds = useCallback(() => {
    const c = parseInt(custom, 10);
    if (!Number.isNaN(c) && c >= 1 && c <= 180) return c * 60;
    return minutes * 60;
  }, [custom, minutes]);

  const start = useCallback(() => {
    const secs = resolveSeconds();
    totalRef.current = secs;
    firedRef.current = new Set();
    endAtRef.current = Date.now() + secs * 1000;
    setRemaining(secs);
    setFinished(false);
    setRunning(true);
    onExpressionChange('calm');
    const msg = task.trim()
      ? `Focusing on “${task.trim()}” for ${Math.round(secs / 60)} minutes. I’ve got the clock — you’ve got this.`
      : `Focusing for ${Math.round(secs / 60)} minutes. I’ve got the clock — you’ve got this.`;
    setNote(msg);
    speakIfOn(msg);
  }, [resolveSeconds, task, onExpressionChange, speakIfOn]);

  const pause = useCallback(() => {
    setRemaining(Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000)));
    setRunning(false);
    setNote('Paused. Breathe — the clock will wait.');
  }, []);

  const resume = useCallback(() => {
    endAtRef.current = Date.now() + remaining * 1000;
    setRunning(true);
    onExpressionChange('calm');
    setNote('And we’re back. Ease in gently.');
  }, [remaining, onExpressionChange]);

  const finish = useCallback(() => {
    setRunning(false);
    setFinished(true);
    setRemaining(0);
    const msg = 'Session wrapped. Whatever you did counts — nicely shown up. 🌱';
    setNote(msg);
    onExpressionChange('happy');
    speakIfOn(msg);
  }, [onExpressionChange, speakIfOn]);

  const resetTimer = useCallback(() => {
    setRunning(false);
    setFinished(false);
    const secs = resolveSeconds();
    totalRef.current = secs;
    setRemaining(secs);
    firedRef.current = new Set();
    onExpressionChange('happy');
    setNote('Set a task and a duration. I’ll keep time while you focus.');
  }, [resolveSeconds, onExpressionChange]);

  const toggleMicPark = useCallback(() => {
    if (voice.listening) {
      voice.stopListening();
    } else {
      voice.startListening((text) => setParkDraft((d) => (d ? `${d} ${text}` : text)));
    }
  }, [voice]);

  const parkThought = useCallback(() => {
    const text = parkDraft.trim();
    if (!text) return;
    setStore((s) => ({ ...s, parked: [...s.parked, { id: nid('p'), text, savedAt: Date.now() }] }));
    setParkDraft('');
  }, [parkDraft]);

  const removeParked = useCallback((id: string) => {
    setStore((s) => ({ ...s, parked: s.parked.filter((p) => p.id !== id) }));
  }, []);

  const parkToTask = useCallback((id: string) => {
    setStore((s) => {
      const item = s.parked.find((p) => p.id === id);
      if (!item) return s;
      return { ...s, parked: s.parked.filter((p) => p.id !== id), queue: [...s.queue, item.text] };
    });
  }, []);

  const loadQueued = useCallback((text: string) => {
    setTask(text);
    setTab('timer');
  }, []);

  const removeQueued = useCallback((text: string) => {
    setStore((s) => ({ ...s, queue: s.queue.filter((q) => q !== text) }));
  }, []);

  const saveBookmark = useCallback(() => {
    if (!task.trim()) return;
    setStore((s) => ({
      ...s,
      bookmarks: [
        { id: nid('b'), task: task.trim(), progress: progressNote.trim(), nextStep: nextStep.trim(), savedAt: Date.now() },
        ...s.bookmarks,
      ].slice(0, 20),
    }));
    setProgressNote('');
    setNextStep('');
  }, [task, progressNote, nextStep]);

  const resumeBookmark = useCallback(
    (b: Bookmark) => {
      setTask(b.task);
      setTab('timer');
      resetTimer();
      setNote(
        b.nextStep
          ? `Picked up “${b.task}”. Next step: ${b.nextStep}`
          : `Picked up “${b.task}” where you left off.`,
      );
      onExpressionChange('happy');
    },
    [resetTimer, onExpressionChange],
  );

  const removeBookmark = useCallback((id: string) => {
    setStore((s) => ({ ...s, bookmarks: s.bookmarks.filter((b) => b.id !== id) }));
  }, []);

  const progress = totalRef.current > 0 ? 1 - remaining / totalRef.current : 0;

  return (
    <div
      style={{
        width: '100%',
        minHeight: 0,
        flex: '1 1 auto',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(10px, 2.2vh, 14px)',
      }}
    >
      <div style={card}>
        <p style={sageText}>🍃 Focus Mode</p>
        <p style={{ ...smallText, marginTop: 4 }}>{note}</p>
      </div>

      <div style={rowStyle} role="tablist" aria-label="Focus sections">
        {(['timer', 'park', 'marks'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            style={tab === t ? primaryPill : pill}
          >
            {t === 'timer' ? '⏱️ Timer' : t === 'park' ? `🅿️ Parking Lot${store.parked.length ? ` (${store.parked.length})` : ''}` : `🔖 Bookmarks${store.bookmarks.length ? ` (${store.bookmarks.length})` : ''}`}
          </button>
        ))}
      </div>

      {tab === 'timer' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="What are you focusing on?"
            aria-label="Focus task"
            disabled={running}
            style={inputStyle}
          />
          <div style={rowStyle}>
            {PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMinutes(m);
                  setCustom('');
                }}
                disabled={running}
                aria-label={`${m} minutes`}
                style={minutes === m && !custom ? primaryPill : pill}
              >
                {m}m
              </button>
            ))}
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
              placeholder="Custom min"
              aria-label="Custom duration in minutes"
              disabled={running}
              inputMode="numeric"
              style={{ ...inputStyle, flex: '0 1 auto', width: 110 }}
            />
            <label style={{ ...smallText, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={reminders}
                onChange={(e) => setReminders(e.target.checked)}
                aria-label="Time-remaining reminders"
              />
              Reminders
            </label>
          </div>

          <div style={card}>
            <p style={{ ...sageText, fontSize: 'clamp(28px, 7vw, 36px)', fontWeight: 700, textAlign: 'center' }}>
              {fmtClock(remaining)}
            </p>
            <div
              style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.10)', marginTop: 8, overflow: 'hidden' }}
              role="progressbar"
              aria-valuenow={Math.round(progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Focus progress"
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.round(progress * 100)}%`,
                  borderRadius: 4,
                  background: 'linear-gradient(90deg, var(--accent-primary), #8F7AD6)',
                  transition: 'width 0.5s linear',
                }}
              />
            </div>
          </div>

          <div style={rowStyle}>
            {!running && !finished && remaining === totalRef.current && (
              <button type="button" onClick={start} style={primaryPill}>
                ▶ Start
              </button>
            )}
            {running && (
              <button type="button" onClick={pause} style={pill}>
                ⏸ Pause
              </button>
            )}
            {!running && !finished && remaining < totalRef.current && remaining > 0 && (
              <button type="button" onClick={resume} style={primaryPill}>
                ▶ Resume
              </button>
            )}
            {(running || (!finished && remaining < totalRef.current)) && (
              <button type="button" onClick={finish} style={pill}>
                ⏹ Finish
              </button>
            )}
            {(finished || (!running && remaining < totalRef.current)) && (
              <button type="button" onClick={resetTimer} style={pill}>
                ↺ Reset
              </button>
            )}
            {voice.ttsSupported && (
              <button
                type="button"
                onClick={() => {
                  if (!voice.voiceOn) voice.setVoiceOn(true);
                  else {
                    voice.setVoiceOn(false);
                    voice.stopSpeaking();
                  }
                }}
                style={{ ...pill, marginLeft: 'auto' }}
                aria-label={voice.voiceOn ? 'Mute Sage voice' : 'Unmute Sage voice'}
              >
                {voice.voiceOn ? '🔊' : '🔇'}
              </button>
            )}
            {voice.speaking && (
              <button type="button" onClick={voice.stopSpeaking} style={pill}>
                ⏹ Stop voice
              </button>
            )}
          </div>
        </div>
      )}

      {tab === 'park' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={smallText}>Park distracting thoughts here without stopping the timer. Deal with them later.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={parkDraft}
              onChange={(e) => setParkDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  parkThought();
                }
              }}
              placeholder="That distracting thought…"
              aria-label="Park a distracting thought"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={toggleMicPark}
              aria-label={voice.listening ? 'Stop dictation' : 'Dictate thought'}
              style={{
                ...pill,
                flex: '0 0 auto',
                padding: '10px 14px',
                background: voice.listening ? 'rgba(255,179,167,0.18)' : 'rgba(255,255,255,0.05)',
              }}
            >
              {voice.listening ? '⏹' : '🎙️'}
            </button>
            <button type="button" onClick={parkThought} disabled={!parkDraft.trim()} style={{ ...primaryPill, flex: '0 0 auto', opacity: !parkDraft.trim() ? 0.5 : 1 }}>
              Park
            </button>
          </div>
          {voice.sttError && <p style={{ ...smallText, color: '#E8B4B8' }}>{voice.sttError}</p>}
          {store.parked.length === 0 && <p style={smallText}>Nothing parked. Mind like still water. 🌊</p>}
          {store.parked.map((p) => (
            <div key={p.id} style={{ ...card, display: 'flex', gap: 8, alignItems: 'center' }}>
              <p style={{ ...smallText, flex: '1 1 auto', color: 'var(--text-primary)' }}>{p.text}</p>
              <button type="button" onClick={() => parkToTask(p.id)} style={pill} aria-label="Convert to task">
                → Task
              </button>
              <button type="button" onClick={() => removeParked(p.id)} style={pill} aria-label="Delete parked thought">
                ✕
              </button>
            </div>
          ))}
          {store.queue.length > 0 && (
            <div style={card}>
              <p style={{ ...smallText, fontWeight: 700, color: 'var(--text-primary)' }}>Queued tasks</p>
              {store.queue.map((q) => (
                <div key={q} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                  <p style={{ ...smallText, flex: '1 1 auto', color: 'var(--text-primary)' }}>{q}</p>
                  <button type="button" onClick={() => loadQueued(q)} style={pill}>
                    Load
                  </button>
                  <button type="button" onClick={() => removeQueued(q)} style={pill} aria-label="Remove queued task">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'marks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={smallText}>Save where you are — task, progress, next step — and pick it back up anytime, even after a refresh.</p>
          <input
            value={progressNote}
            onChange={(e) => setProgressNote(e.target.value)}
            placeholder="Where am I? (progress so far)"
            aria-label="Current progress"
            style={inputStyle}
          />
          <input
            value={nextStep}
            onChange={(e) => setNextStep(e.target.value)}
            placeholder="Next step when I return"
            aria-label="Next step"
            style={inputStyle}
          />
          <div style={rowStyle}>
            <button type="button" onClick={saveBookmark} disabled={!task.trim()} style={{ ...primaryPill, opacity: !task.trim() ? 0.5 : 1 }}>
              🔖 Save bookmark
            </button>
          </div>
          {store.bookmarks.length === 0 && <p style={smallText}>No bookmarks yet.</p>}
          {store.bookmarks.map((b) => (
            <div key={b.id} style={card}>
              <p style={{ ...sageText, fontSize: 'clamp(13px, 3vw, 15px)' }}>“{b.task}”</p>
              {b.progress && <p style={{ ...smallText, marginTop: 4 }}>Where: {b.progress}</p>}
              {b.nextStep && <p style={{ ...smallText, marginTop: 2 }}>Next: {b.nextStep}</p>}
              <p style={{ ...smallText, marginTop: 4, opacity: 0.6 }}>{new Date(b.savedAt).toLocaleString()}</p>
              <div style={{ ...rowStyle, marginTop: 8 }}>
                <button type="button" onClick={() => resumeBookmark(b)} style={primaryPill}>
                  ▶ Resume
                </button>
                <button type="button" onClick={() => removeBookmark(b.id)} style={pill}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={onExit} style={{ ...pill, alignSelf: 'flex-start', opacity: 0.85 }}>
        ↩ Exit Focus
      </button>
    </div>
  );
};

FocusMode.displayName = 'FocusMode';
