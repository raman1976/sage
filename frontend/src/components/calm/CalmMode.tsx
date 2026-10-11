import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { SageExpression } from '../../types';
import { api, type ChatMessage } from '../../services/api';
import { useVoice } from '../../hooks/useVoice';

type CalmView = 'options' | 'breathe' | 'ground' | 'talk' | 'done';

interface CalmModeProps {
  onExit: () => void;
  onExpressionChange: (expr: SageExpression | null) => void;
}

interface TalkMsg {
  id: number;
  role: 'sage' | 'user';
  text: string;
}

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

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

let msgId = 1;
const nextId = () => msgId++;

/** Short, scripted comfort replies. Clearly local — never presented as AI. */
function localComfortReply(turn: number): string {
  if (turn <= 0) {
    return "Thank you for trusting me with that. That sounds really heavy. What's weighing on you the most right now?";
  }
  const followUps = [
    "I'm still here with you. That makes complete sense. Would it help to say a little more about it?",
    'Mm. It’s okay to feel this way. Take your time — I’m not going anywhere.',
    "You're doing well by putting it into words. What feels hardest about it right now?",
    'I hear you. Let’s take this one small piece at a time. What’s one thing that would feel even a tiny bit lighter?',
  ];
  return followUps[(turn - 1) % followUps.length];
}

const GROUND_STEPS = [
  { n: 5, sense: 'see', prompt: 'Name 5 things you can see around you.', hint: 'Look slowly. Colours, shapes, light — anything counts.' },
  { n: 4, sense: 'touch', prompt: 'Notice 4 things you can touch or feel.', hint: 'Your chair, your sleeves, the air on your skin.' },
  { n: 3, sense: 'hear', prompt: 'Listen for 3 sounds, near or far.', hint: 'Hum, footsteps, breathing — just notice them.' },
  { n: 2, sense: 'smell', prompt: 'Notice 2 things you can smell.', hint: 'Tea, fresh air, soap — or simply breathe in.' },
  { n: 1, sense: 'taste', prompt: 'Name 1 thing you can taste — or one kind thing about yourself.', hint: 'Either answer is a good answer.' },
];

const GROUND_PRAISE = [
  'Well done. You’re already slowing down.',
  'Good. Feel your feet where they are.',
  'Nice. You’re coming back to right now.',
  'Almost there. One more gentle step.',
  'You did it. Notice how this moment feels.',
];

const SMALL_STEPS = [
  'Drink a glass of water, slowly.',
  'Roll your shoulders back three times.',
  'Tidy one tiny corner of your desk.',
  'Step outside or to a window for one minute.',
  'Write down the one thing that matters most today.',
];

export const CalmMode = ({ onExit, onExpressionChange }: CalmModeProps) => {
  const [view, setView] = useState<CalmView>('options');
  const [doneFrom, setDoneFrom] = useState('that exercise');
  const reduced = useReducedMotion();

  useEffect(() => {
    onExpressionChange('calm');
    return () => onExpressionChange(null);
  }, [onExpressionChange]);

  const goExercise = useCallback(
    (v: CalmView) => {
      onExpressionChange('calm');
      setView(v);
    },
    [onExpressionChange],
  );

  const finishExercise = useCallback(
    (label: string) => {
      setDoneFrom(label);
      onExpressionChange('calm');
      setView('done');
    },
    [onExpressionChange],
  );

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
      {view === 'options' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 2.2vh, 14px)' }}>
          <div style={card}>
            <p style={sageText}>I&apos;m here with you. What would help right now?</p>
            <p style={{ ...smallText, marginTop: 6, opacity: 0.75 }}>
              Offline comfort mode · conversational AI unavailable · everything stays on this device.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" style={primaryPill} onClick={() => goExercise('breathe')} aria-label="Start breathing exercise">
              🌬️ Breathe
            </button>
            <button type="button" style={pill} onClick={() => goExercise('ground')} aria-label="Start grounding exercise">
              🌱 Ground Me
            </button>
            <button type="button" style={pill} onClick={() => goExercise('talk')} aria-label="Talk it out">
              💬 Talk It Out
            </button>
          </div>
        </div>
      )}

      {view === 'breathe' && (
        <BreatheView
          reduced={reduced}
          onComplete={() => finishExercise('breathing')}
          onBack={() => goExercise('options')}
          onExpressionChange={onExpressionChange}
        />
      )}

      {view === 'ground' && (
        <GroundView onComplete={() => finishExercise('grounding')} onBack={() => goExercise('options')} />
      )}

      {view === 'talk' && (
        <TalkView
          onDone={() => finishExercise('our talk')}
          onBack={() => goExercise('options')}
          onExpressionChange={onExpressionChange}
        />
      )}

      {view === 'done' && <DoneView doneFrom={doneFrom} onExit={onExit} onOptions={() => goExercise('options')} />}
    </div>
  );
};

CalmMode.displayName = 'CalmMode';

/* ---------------------------------- Breathe ---------------------------------- */

const BREATH_MS = 4000;

function BreatheView({
  reduced,
  onComplete,
  onBack,
  onExpressionChange,
}: {
  reduced: boolean;
  onComplete: () => void;
  onBack: () => void;
  onExpressionChange: (expr: SageExpression | null) => void;
}) {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [cycles, setCycles] = useState(0);
  const [remain, setRemain] = useState(4);
  const timerRef = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  const advance = useCallback(() => {
    setPhase((prev) => {
      if (prev === 'inhale') return 'exhale';
      setCycles((c) => c + 1);
      return 'inhale';
    });
  }, []);

  useEffect(() => {
    if (!running || reduced) return;
    timerRef.current = window.setTimeout(advance, BREATH_MS);
    return clear;
  }, [running, phase, reduced, advance, clear]);

  useEffect(() => {
    if (!running || reduced) return;
    setRemain(4);
    const id = window.setInterval(() => setRemain((r) => Math.max(0, r - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running, phase, reduced]);

  useEffect(() => {
    onExpressionChange('calm');
  }, [onExpressionChange]);

  const start = () => {
    setPhase('inhale');
    setRunning(true);
  };
  const pause = () => {
    clear();
    setRunning(false);
  };
  const stop = () => {
    clear();
    setRunning(false);
    if (cycles >= 1) onComplete();
    else onBack();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 2.2vh, 14px)' }}>
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 14 }}>
        {!reduced ? (
          <motion.div
            key={`${phase}-${cycles}-${running}`}
            initial={{ scale: phase === 'inhale' ? 1 : 1.35, opacity: 0.9 }}
            animate={running ? { scale: phase === 'inhale' ? 1.35 : 1, opacity: 1 } : { scale: 1, opacity: 0.85 }}
            transition={{ duration: running ? BREATH_MS / 1000 : 0.3, ease: 'easeInOut' }}
            style={{
              width: 'clamp(56px, 14vh, 84px)',
              height: 'clamp(56px, 14vh, 84px)',
              flex: '0 0 auto',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 40% 35%, #D9CBF2 0%, var(--accent-primary) 55%, #8F7AD6 100%)',
              boxShadow: '0 0 24px var(--accent-glow)',
            }}
            aria-hidden
          />
        ) : (
          <div
            style={{
              width: 56,
              height: 56,
              flex: '0 0 auto',
              borderRadius: '50%',
              border: '2px solid var(--accent-primary)',
              background: 'rgba(185,161,221,0.10)',
            }}
            aria-hidden
          />
        )}
        <div>
          <p style={sageText}>
            {!running && cycles === 0
              ? 'We’ll breathe together — 4 seconds in, 4 seconds out.'
              : running
                ? phase === 'inhale'
                  ? `Breathe in… ${remain}`
                  : `Let it out… ${remain}`
                : 'Paused. No rush at all.'}
          </p>
          <p style={smallText}>Round {running ? cycles + 1 : Math.max(cycles, 1)} · inhale 4s · exhale 4s</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {!running ? (
          <button type="button" style={primaryPill} onClick={start}>
            {cycles > 0 ? '▶ Resume' : '▶ Start'}
          </button>
        ) : (
          <button type="button" style={pill} onClick={pause}>
            ⏸ Pause
          </button>
        )}
        {reduced && running && (
          <button type="button" style={pill} onClick={advance}>
            Next: {phase === 'inhale' ? 'exhale →' : 'inhale →'}
          </button>
        )}
        <button type="button" style={pill} onClick={stop}>
          ⏹ Stop
        </button>
        <button type="button" style={pill} onClick={onBack}>
          ← Options
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------- Ground ---------------------------------- */

function GroundView({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const [praise, setPraise] = useState<string | null>(null);
  const step = GROUND_STEPS[index];

  const next = useCallback(() => {
    setPraise(GROUND_PRAISE[index] ?? 'Gently done.');
    if (index >= GROUND_STEPS.length - 1) {
      window.setTimeout(onComplete, 900);
    } else {
      setIndex((i) => i + 1);
    }
  }, [index, onComplete]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 2.2vh, 14px)' }}>
      <div style={card}>
        <p style={{ ...smallText, opacity: 0.8 }}>
          Step {index + 1} of {GROUND_STEPS.length}
        </p>
        <p style={{ ...sageText, marginTop: 4 }}>{step.prompt}</p>
        <p style={{ ...smallText, marginTop: 6 }}>{step.hint}</p>
        {praise && <p style={{ ...smallText, marginTop: 8, color: 'var(--accent-primary)' }}>{praise}</p>}
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }} aria-hidden>
          {GROUND_STEPS.map((s, i) => (
            <div
              key={s.sense}
              style={{
                width: 22,
                height: 6,
                borderRadius: 3,
                background: i <= index ? 'var(--accent-primary)' : 'rgba(255,255,255,0.12)',
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" style={primaryPill} onClick={next}>
          {index >= GROUND_STEPS.length - 1 ? '✓ Done' : 'Next →'}
        </button>
        <button type="button" style={pill} onClick={next}>
          Skip
        </button>
        <button type="button" style={pill} onClick={onBack}>
          ← Options
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------- Talk ----------------------------------- */

function TalkView({
  onDone,
  onBack,
  onExpressionChange,
}: {
  onDone: () => void;
  onBack: () => void;
  onExpressionChange: (expr: SageExpression | null) => void;
}) {
  const voice = useVoice();
  const [messages, setMessages] = useState<TalkMsg[]>([
    { id: nextId(), role: 'sage', text: "I'm listening. Tell me what's feeling overwhelming — take your time." },
  ]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [turn, setTurn] = useState(0);
  const [aiChecked, setAiChecked] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    onExpressionChange('curious');
  }, [onExpressionChange]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => voice.stopSpeaking, [voice.stopSpeaking]);

  const speakIfOn = useCallback(
    (text: string) => {
      if (voice.voiceOn && voice.ttsSupported) voice.speak(text);
    },
    [voice],
  );

  useEffect(() => {
    speakIfOn("I'm listening. Tell me what's feeling overwhelming — take your time.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      voice.stopListening();
      onExpressionChange('curious');
      setMessages((m) => [...m, { id: nextId(), role: 'user', text }]);
      setDraft('');

      let reply: string | null = null;
      try {
        if (!aiChecked) {
          setAiChecked(true);
        }
        const history: ChatMessage[] = [
          {
            role: 'system',
            content:
              'You are Sage, a gentle ADHD support companion. Keep replies to 1-2 short sentences. Acknowledge feelings, ask at most one question, never judge, never give unsolicited productivity advice.',
          },
          ...messages.slice(-6).map((m) => ({
            role: (m.role === 'sage' ? 'assistant' : 'user') as 'assistant' | 'user',
            content: m.text,
          })),
          { role: 'user', content: text },
        ];
        const res = await api.chat(history);
        if (res?.reply) {
          reply = res.reply;
          setAiAvailable(true);
        }
      } catch {
        setAiAvailable(false);
        reply = null;
      }

      // Small processing beat so the reply feels heard, not instant.
      await new Promise((r) => window.setTimeout(r, 500));
      const finalReply = reply ?? localComfortReply(turn);
      setTurn((t) => t + 1);
      setMessages((m) => [...m, { id: nextId(), role: 'sage', text: finalReply as string }]);
      onExpressionChange('calm');
      speakIfOn(finalReply as string);
      setBusy(false);
      busyRef.current = false;
    },
    [aiChecked, messages, onExpressionChange, speakIfOn, turn, voice],
  );

  const toggleMic = useCallback(() => {
    if (voice.listening) {
      voice.stopListening();
      onExpressionChange('calm');
    } else {
      onExpressionChange('curious');
      voice.startListening((text) => {
        setDraft(text);
      });
    }
  }, [voice, onExpressionChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, flex: '1 1 auto' }}>
      {!aiAvailable && (
        <p style={{ ...smallText, opacity: 0.75 }}>
          Offline comfort mode · conversational AI unavailable · your words stay on this device.
        </p>
      )}
      <div
        ref={listRef}
        style={{
          ...card,
          flex: '1 1 auto',
          minHeight: 90,
          maxHeight: 'clamp(140px, 34vh, 260px)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
        role="log"
        aria-live="polite"
        aria-label="Conversation with Sage"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '88%',
              background: m.role === 'user' ? 'rgba(185,161,221,0.14)' : 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-color)',
              borderRadius: 14,
              padding: '8px 12px',
            }}
          >
            <p style={{ ...(m.role === 'user' ? smallText : sageText), margin: 0, color: 'var(--text-primary)' }}>
              {m.text}
            </p>
          </div>
        ))}
        {busy && <p style={smallText}>Sage is listening…</p>}
      </div>

      {voice.sttError && <p style={{ ...smallText, color: '#E8B4B8' }}>{voice.sttError}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
          placeholder="Type what's on your mind…"
          disabled={busy}
          aria-label="Type your message to Sage"
          style={{
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
          }}
        />
        <button
          type="button"
          onClick={toggleMic}
          disabled={busy}
          aria-label={voice.listening ? 'Stop listening' : 'Speak instead of typing'}
          title={voice.listening ? 'Stop listening' : 'Speak instead of typing'}
          style={{
            ...pill,
            flex: '0 0 auto',
            padding: '10px 14px',
            background: voice.listening ? 'rgba(255,179,167,0.18)' : 'rgba(255,255,255,0.05)',
            border: voice.listening ? '1px solid #ffb3a7' : '1px solid var(--border-color)',
          }}
        >
          {voice.listening ? '⏹' : '🎙️'}
        </button>
        <button
          type="button"
          onClick={() => send(draft)}
          disabled={busy || !draft.trim()}
          aria-label="Send message"
          style={{ ...primaryPill, flex: '0 0 auto', padding: '10px 16px', opacity: busy || !draft.trim() ? 0.5 : 1 }}
        >
          ➤
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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
            aria-label={voice.voiceOn ? 'Mute Sage voice' : 'Unmute Sage voice'}
            style={pill}
          >
            {voice.voiceOn ? '🔊 Voice on' : '🔇 Muted'}
          </button>
        )}
        {voice.speaking && (
          <button type="button" onClick={voice.stopSpeaking} aria-label="Stop Sage speaking" style={pill}>
            ⏹ Stop voice
          </button>
        )}
        {voice.listening && <p style={smallText}>Listening… tap ⏹ when you’re done.</p>}
        <span style={{ flex: '1 1 auto' }} />
        <button type="button" onClick={onBack} style={pill}>
          ← Options
        </button>
        <button type="button" onClick={onDone} style={pill}>
          I feel better ✓
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------- Restart ---------------------------------- */

const DONE_QUESTION = 'Would you like to take one small step, rest, or go back to what you were doing?';

function DoneView({
  doneFrom,
  onExit,
  onOptions,
}: {
  doneFrom: string;
  onExit: () => void;
  onOptions: () => void;
}) {
  const [panel, setPanel] = useState<'none' | 'step' | 'rest'>('none');
  const [stepIndex, setStepIndex] = useState(0);
  const [stepDone, setStepDone] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 2.2vh, 14px)' }}>
      <div style={card}>
        <p style={sageText}>Thank you for doing {doneFrom} with me. 💜</p>
        <p style={{ ...sageText, marginTop: 6 }}>{DONE_QUESTION}</p>
      </div>

      {panel === 'step' && (
        <div style={card}>
          {!stepDone ? (
            <>
              <p style={sageText}>How about this — just this one:</p>
              <p style={{ ...sageText, marginTop: 6, color: 'var(--accent-primary)' }}>{SMALL_STEPS[stepIndex % SMALL_STEPS.length]}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button type="button" style={primaryPill} onClick={() => setStepDone(true)}>
                  Done ✓
                </button>
                <button type="button" style={pill} onClick={() => setStepIndex((i) => i + 1)}>
                  Another idea
                </button>
              </div>
            </>
          ) : (
            <p style={sageText}>Lovely. One small step is more than enough. 🌱</p>
          )}
        </div>
      )}

      {panel === 'rest' && (
        <div style={card}>
          <p style={sageText}>Rest as long as you like. I’ll be right here, breathing with you.</p>
          <p style={{ ...smallText, marginTop: 6 }}>No timers, no pressure. Come back whenever you’re ready.</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" style={primaryPill} onClick={() => { setPanel('step'); setStepDone(false); }}>
          🌱 One small step
        </button>
        <button type="button" style={pill} onClick={() => setPanel(panel === 'rest' ? 'none' : 'rest')}>
          🌙 Rest a moment
        </button>
        <button type="button" style={pill} onClick={onExit}>
          ↩ Back to what I was doing
        </button>
      </div>
      <button
        type="button"
        onClick={onOptions}
        style={{ ...pill, alignSelf: 'flex-start', opacity: 0.85 }}
      >
        Try another exercise
      </button>
    </div>
  );
}
