import { useCallback, useEffect, useRef, useState } from 'react';
import type { SageExpression } from '../../types';
import { api, type ChatMessage } from '../../services/api';
import { useVoice } from '../../hooks/useVoice';

type CompanionView = 'options' | 'duck' | 'dump' | 'double' | 'roleplay';

interface CompanionModeProps {
  onExit: () => void;
  onExpressionChange: (expr: SageExpression | null) => void;
}

interface Msg {
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

let msgId = 1;
const nextId = () => msgId++;

/* ------------------------------ offline scripts ----------------------------- */

function localDuckReply(turn: number): string {
  if (turn <= 0) {
    return 'Okay, I’m listening. Walk me through it — what’s the problem you’re chewing on?';
  }
  const questions = [
    'What have you already tried, and what happened?',
    'What would “done” look like here?',
    'What’s the smallest piece of this you could untangle first?',
    'What are you assuming that might not be true?',
    'If a friend described this exact problem, what would you ask them?',
    'What’s one thing you know for sure about this, and one thing you’re unsure of?',
  ];
  const openers = ['Mm, good detail.', 'Got it. Let me think with you for a second.', 'That helps. Okay…'];
  return `${openers[(turn - 1) % openers.length]} ${questions[(turn - 1) % questions.length]}`;
}

function localRoleplayNudge(turn: number): string {
  const nudges = [
    'Good start. Say your opening line as you’d really say it — I’m listening.',
    'Nice. Now try saying the hardest part out loud.',
    'You’re doing well. What would you say if they push back on that?',
    'Strong. Try wrapping up — how would you close this conversation?',
  ];
  return turn <= 0
    ? 'Alright, I’m in role — well, almost. AI roleplay isn’t available right now, so let’s rehearse solo: say your opening line, and I’ll coach you through it.'
    : nudges[(turn - 1) % nudges.length];
}

function localFeedback(): string {
  return 'Here’s my honest take: your points come through clearly, and your tone stays respectful. One tip — pause after your main point instead of filling the silence. Want to run it once more?';
}

/* ------------------------------ message list -------------------------------- */

function ChatLog({ messages, busy, busyText }: { messages: Msg[]; busy: boolean; busyText: string }) {
  const listRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);
  return (
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
          <p style={{ ...sageText, margin: 0, fontSize: 'clamp(13px, 3vw, 15px)' }}>{m.text}</p>
        </div>
      ))}
      {busy && <p style={smallText}>{busyText}</p>}
    </div>
  );
}

/* ------------------------------- voice controls ------------------------------ */

function VoiceRow({
  voice,
  onToggleMic,
  busy,
}: {
  voice: ReturnType<typeof useVoice>;
  onToggleMic: () => void;
  busy: boolean;
}) {
  return (
    <>
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
      {voice.listening && (
        <button type="button" onClick={onToggleMic} disabled={busy} style={pill}>
          ⏹ Stop listening
        </button>
      )}
    </>
  );
}

function MicSendRow({
  draft,
  setDraft,
  onSend,
  busy,
  voice,
  onToggleMic,
  placeholder,
}: {
  draft: string;
  setDraft: (v: string) => void;
  onSend: (v: string) => void;
  busy: boolean;
  voice: ReturnType<typeof useVoice>;
  onToggleMic: () => void;
  placeholder: string;
}) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend(draft);
          }
        }}
        placeholder={placeholder}
        disabled={busy}
        aria-label={placeholder}
        style={inputStyle}
      />
      <button
        type="button"
        onClick={onToggleMic}
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
        onClick={() => onSend(draft)}
        disabled={busy || !draft.trim()}
        aria-label="Send message"
        style={{ ...primaryPill, flex: '0 0 auto', padding: '10px 16px', opacity: busy || !draft.trim() ? 0.5 : 1 }}
      >
        ➤
      </button>
    </div>
  );
}

/* --------------------------------- main view --------------------------------- */

export const CompanionMode = ({ onExit, onExpressionChange }: CompanionModeProps) => {
  const [view, setView] = useState<CompanionView>('options');

  useEffect(() => {
    onExpressionChange('happy');
    return () => onExpressionChange(null);
  }, [onExpressionChange]);

  const go = useCallback(
    (v: CompanionView) => {
      onExpressionChange('happy');
      setView(v);
    },
    [onExpressionChange],
  );

  const back = useCallback(() => go('options'), [go]);

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
            <p style={sageText}>I&apos;m here! What would you like to do together?</p>
            <p style={{ ...smallText, marginTop: 6, opacity: 0.75 }}>
              Offline companion mode · conversational AI unavailable · everything stays on this device.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" style={primaryPill} onClick={() => go('duck')} aria-label="Think with me">
              🦆 Think With Me
            </button>
            <button type="button" style={pill} onClick={() => go('dump')} aria-label="Clear my mind">
              🧠 Clear My Mind
            </button>
            <button type="button" style={pill} onClick={() => go('double')} aria-label="Work with me">
              🤝 Work With Me
            </button>
            <button type="button" style={pill} onClick={() => go('roleplay')} aria-label="Rehearse with me">
              🎭 Rehearse With Me
            </button>
          </div>
        </div>
      )}

      {view === 'duck' && <DuckView onBack={back} onExpressionChange={onExpressionChange} />}
      {view === 'dump' && <DumpView onBack={back} onExpressionChange={onExpressionChange} />}
      {view === 'double' && <DoubleView onBack={back} onExpressionChange={onExpressionChange} />}
      {view === 'roleplay' && <RoleplayView onBack={back} onExpressionChange={onExpressionChange} />}

      {view !== 'options' && (
        <button type="button" onClick={onExit} style={{ ...pill, alignSelf: 'flex-start', opacity: 0.85 }}>
          ↩ Exit Companion
        </button>
      )}
    </div>
  );
};

CompanionMode.displayName = 'CompanionMode';

/* -------------------------------- Rubber Duck -------------------------------- */

function DuckView({
  onBack,
  onExpressionChange,
}: {
  onBack: () => void;
  onExpressionChange: (expr: SageExpression | null) => void;
}) {
  const voice = useVoice();
  const [messages, setMessages] = useState<Msg[]>([
    { id: nextId(), role: 'sage', text: 'Tell me about the problem — out loud or in words. I’ll think it through with you, one question at a time.' },
  ]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [turn, setTurn] = useState(0);
  const [aiAvailable, setAiAvailable] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    onExpressionChange('curious');
  }, [onExpressionChange]);
  useEffect(() => voice.stopSpeaking, [voice.stopSpeaking]);

  const speakIfOn = useCallback(
    (text: string) => {
      if (voice.voiceOn && voice.ttsSupported) voice.speak(text);
    },
    [voice],
  );

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
        const history: ChatMessage[] = [
          {
            role: 'system',
            content:
              'You are Sage, a rubber-duck thinking partner for someone with ADHD. Listen, reflect briefly, then ask exactly ONE thoughtful question that helps them reason. Never give solutions unless asked. Keep replies under 3 sentences.',
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

      await new Promise((r) => window.setTimeout(r, 500));
      const finalReply = reply ?? localDuckReply(turn);
      setTurn((t) => t + 1);
      setMessages((m) => [...m, { id: nextId(), role: 'sage', text: finalReply as string }]);
      onExpressionChange('happy');
      speakIfOn(finalReply as string);
      setBusy(false);
      busyRef.current = false;
    },
    [messages, onExpressionChange, speakIfOn, turn, voice],
  );

  const toggleMic = useCallback(() => {
    if (voice.listening) {
      voice.stopListening();
      onExpressionChange('happy');
    } else {
      onExpressionChange('curious');
      voice.startListening((text) => setDraft(text));
    }
  }, [voice, onExpressionChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, flex: '1 1 auto' }}>
      <div style={card}>
        <p style={sageText}>🦆 Rubber Duck — Think With Me</p>
        {!aiAvailable && <p style={{ ...smallText, marginTop: 4, opacity: 0.75 }}>Offline mode · guided questions, no AI.</p>}
      </div>
      <ChatLog messages={messages} busy={busy} busyText="Sage is thinking…" />
      {voice.sttError && <p style={{ ...smallText, color: '#E8B4B8' }}>{voice.sttError}</p>}
      <MicSendRow draft={draft} setDraft={setDraft} onSend={send} busy={busy} voice={voice} onToggleMic={toggleMic} placeholder="Explain the problem…" />
      <div style={rowStyle}>
        <VoiceRow voice={voice} onToggleMic={toggleMic} busy={busy} />
        <span style={{ flex: '1 1 auto' }} />
        <button type="button" onClick={onBack} style={pill}>
          ← Back
        </button>
      </div>
    </div>
  );
}

/* -------------------------------- Brain Dump --------------------------------- */

type Bucket = 'tasks' | 'worries' | 'ideas' | 'reminders';

interface DumpItem {
  id: string;
  text: string;
  bucket: Bucket;
}

const BUCKETS: { id: Bucket; label: string; icon: string }[] = [
  { id: 'tasks', label: 'Tasks', icon: '✅' },
  { id: 'worries', label: 'Worries', icon: '💭' },
  { id: 'ideas', label: 'Ideas', icon: '💡' },
  { id: 'reminders', label: 'Reminders', icon: '⏰' },
];

const DUMP_KEY = 'sage-braindump';

function classifyLine(line: string): Bucket {
  const t = line.toLowerCase();
  if (/\b(worr|anxious|afraid|scared|stress|overwhelm|can't|cannot|deadline|behind|fail|nervous)\b/.test(t)) return 'worries';
  if (/\b(remind|remember|don't forget|dont forget|call|email|pay|buy|pick up|appointment|meeting|due|schedule)\b/.test(t)) return 'reminders';
  if (/\b(idea|maybe|could|what if|try|project|blog|design|learn|someday)\b/.test(t)) return 'ideas';
  return 'tasks';
}

function loadDump(): DumpItem[] {
  try {
    const raw = localStorage.getItem(DUMP_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DumpItem[];
    return Array.isArray(parsed) ? parsed.filter((i) => i && typeof i.text === 'string') : [];
  } catch {
    return [];
  }
}

function DumpView({
  onBack,
  onExpressionChange,
}: {
  onBack: () => void;
  onExpressionChange: (expr: SageExpression | null) => void;
}) {
  const voice = useVoice();
  const [draft, setDraft] = useState('');
  const [items, setItems] = useState<DumpItem[]>(loadDump);
  const [organized, setOrganized] = useState(() => loadDump().length > 0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    onExpressionChange('happy');
  }, [onExpressionChange]);
  useEffect(() => voice.stopSpeaking, [voice.stopSpeaking]);

  const toggleMic = useCallback(() => {
    if (voice.listening) {
      voice.stopListening();
      onExpressionChange('happy');
    } else {
      onExpressionChange('curious');
      voice.startListening((text) => setDraft((d) => (d ? `${d} ${text}` : text)));
    }
  }, [voice, onExpressionChange]);

  const organize = useCallback(() => {
    const lines = draft
      .split(/\n+/)
      .map((l) => l.trim().replace(/^[-*•\d.)\s]+/, ''))
      .filter(Boolean);
    if (lines.length === 0 && items.length === 0) return;
    const fresh: DumpItem[] = lines.map((text, i) => ({
      id: `${Date.now()}-${i}`,
      text,
      bucket: classifyLine(text),
    }));
    const merged = [...items, ...fresh];
    setItems(merged);
    setDraft('');
    setOrganized(true);
    setSaved(false);
    onExpressionChange('happy');
    try {
      localStorage.setItem(DUMP_KEY, JSON.stringify(merged));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [draft, items, onExpressionChange]);

  const updateItem = useCallback(
    (id: string, patch: Partial<DumpItem>) => {
      setItems((prev) => {
        const next = prev.map((i) => (i.id === id ? { ...i, ...patch } : i));
        try {
          localStorage.setItem(DUMP_KEY, JSON.stringify(next));
        } catch {
          /* storage unavailable */
        }
        return next;
      });
      setSaved(true);
    },
    [],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      try {
        localStorage.setItem(DUMP_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    setOrganized(false);
    setSaved(false);
    try {
      localStorage.removeItem(DUMP_KEY);
    } catch {
      /* noop */
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, flex: '1 1 auto' }}>
      <div style={card}>
        <p style={sageText}>🧠 Brain Dump — Clear My Mind</p>
        <p style={{ ...smallText, marginTop: 4 }}>
          {organized
            ? 'Here’s everything, sorted. Edit, move, or remove anything — it saves on this device.'
            : 'Pour it all out — every thought, worry, and idea. I’ll help sort it.'}
        </p>
      </div>

      {!organized ? (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={'Everything on your mind… one per line.\n\n- finish the report\n- worried about dentist\n- idea: photo wall'}
            rows={4}
            aria-label="Dump everything on your mind"
            style={{
              ...inputStyle,
              borderRadius: 16,
              resize: 'vertical',
              minHeight: 90,
              fontFamily: 'system-ui, sans-serif',
              lineHeight: 1.5,
            }}
          />
          {voice.sttError && <p style={{ ...smallText, color: '#E8B4B8' }}>{voice.sttError}</p>}
          <div style={rowStyle}>
            <button type="button" onClick={toggleMic} style={pill} aria-label={voice.listening ? 'Stop dictation' : 'Dictate instead of typing'}>
              {voice.listening ? '⏹ Stop dictation' : '🎙️ Dictate'}
            </button>
            <button
              type="button"
              onClick={organize}
              disabled={!draft.trim() && items.length === 0}
              style={{ ...primaryPill, opacity: !draft.trim() && items.length === 0 ? 0.5 : 1 }}
            >
              ✨ Organize
            </button>
            <span style={{ flex: '1 1 auto' }} />
            <button type="button" onClick={onBack} style={pill}>
              ← Back
            </button>
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              ...card,
              flex: '1 1 auto',
              minHeight: 90,
              maxHeight: 'clamp(140px, 34vh, 260px)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {items.length === 0 && <p style={smallText}>All clear. Beautiful.</p>}
            {BUCKETS.map((b) => {
              const inBucket = items.filter((i) => i.bucket === b.id);
              if (inBucket.length === 0) return null;
              return (
                <div key={b.id}>
                  <p style={{ ...smallText, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {b.icon} {b.label} ({inBucket.length})
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                    {inBucket.map((item) => (
                      <div key={item.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          value={item.text}
                          onChange={(e) => updateItem(item.id, { text: e.target.value })}
                          aria-label={`Edit ${b.label} item`}
                          style={{ ...inputStyle, padding: '8px 12px', fontSize: 'clamp(12px, 2.8vw, 14px)' }}
                        />
                        <select
                          value={item.bucket}
                          onChange={(e) => updateItem(item.id, { bucket: e.target.value as Bucket })}
                          aria-label="Move to another list"
                          style={{
                            ...inputStyle,
                            flex: '0 0 auto',
                            width: 104,
                            padding: '8px 8px',
                            fontSize: 12,
                          }}
                        >
                          {BUCKETS.map((ob) => (
                            <option key={ob.id} value={ob.id}>
                              {ob.icon} {ob.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label="Remove item"
                          style={{ ...pill, flex: '0 0 auto', padding: '8px 12px' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={rowStyle}>
            <button
              type="button"
              onClick={() => {
                setOrganized(false);
                setDraft('');
              }}
              style={pill}
            >
              ＋ Add more
            </button>
            <button type="button" onClick={clearAll} style={pill}>
              🗑 Clear all
            </button>
            {saved && <p style={smallText}>Saved ✓</p>}
            <span style={{ flex: '1 1 auto' }} />
            <button type="button" onClick={onBack} style={pill}>
              ← Back
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------- Body Double -------------------------------- */
/* Untimed, quiet companionship. All countdowns live in Focus Mode only. */

const CHECKIN_MS = 5 * 60 * 1000;

const DOUBLE_NOTES = [
  'Still here with you. No rush at all.',
  'Quietly keeping you company — you’re doing fine.',
  'Here whenever you need me. Keep going gently.',
  'No pressure, no clock. Just us, working side by side.',
];

function DoubleView({
  onBack,
  onExpressionChange,
}: {
  onBack: () => void;
  onExpressionChange: (expr: SageExpression | null) => void;
}) {
  const voice = useVoice();
  const [task, setTask] = useState('');
  const [active, setActive] = useState(false);
  const [checkins, setCheckins] = useState(true);
  const [note, setNote] = useState('I’ll stay right here, quietly. You’ve got this.');
  const [checkinCount, setCheckinCount] = useState(0);

  useEffect(() => {
    onExpressionChange('calm');
  }, [onExpressionChange]);
  useEffect(() => voice.stopSpeaking, [voice.stopSpeaking]);

  const speakIfOn = useCallback(
    (text: string) => {
      if (voice.voiceOn && voice.ttsSupported) voice.speak(text);
    },
    [voice],
  );

  useEffect(() => {
    if (!active || !checkins) return;
    const id = window.setInterval(() => {
      setCheckinCount((c) => {
        const msg = DOUBLE_NOTES[c % DOUBLE_NOTES.length];
        setNote(msg);
        speakIfOn(msg);
        return c + 1;
      });
    }, CHECKIN_MS);
    return () => window.clearInterval(id);
  }, [active, checkins, speakIfOn]);

  const start = useCallback(() => {
    setActive(true);
    setCheckinCount(0);
    onExpressionChange('calm');
    const msg = task.trim()
      ? `Keeping you company while you work on “${task.trim()}”. No clock, no pressure — I’m right here.`
      : 'Keeping you company. No clock, no pressure — I’m right here.';
    setNote(msg);
    speakIfOn(msg);
  }, [task, onExpressionChange, speakIfOn]);

  const end = useCallback(() => {
    setActive(false);
    onExpressionChange('happy');
    const msg = 'Thanks for letting me sit with you. You showed up — that counts. 🌱';
    setNote(msg);
    speakIfOn(msg);
  }, [onExpressionChange, speakIfOn]);

  void checkinCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, flex: '1 1 auto' }}>
      <div style={card}>
        <p style={sageText}>🤝 Body Double — Quiet Company</p>
        {!active ? (
          <p style={{ ...smallText, marginTop: 4 }}>No timers, no countdowns — just Sage, staying present while you work.</p>
        ) : (
          <p style={{ ...sageText, marginTop: 6 }}>{note}</p>
        )}
      </div>

      {!active ? (
        <>
          <input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="What are we working on? (optional)"
            aria-label="Task to work on"
            style={inputStyle}
          />
          <div style={rowStyle}>
            <label style={{ ...smallText, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={checkins}
                onChange={(e) => setCheckins(e.target.checked)}
                aria-label="Gentle check-ins"
              />
              Gentle check-ins
            </label>
          </div>
          <div style={rowStyle}>
            <button type="button" onClick={start} style={primaryPill}>
              ▶ Start Companionship
            </button>
            <span style={{ flex: '1 1 auto' }} />
            <button type="button" onClick={onBack} style={pill}>
              ← Back
            </button>
          </div>
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
              style={{ ...pill, alignSelf: 'flex-start' }}
            >
              {voice.voiceOn ? '🔊 Voice on' : '🔇 Muted'}
            </button>
          )}
        </>
      ) : (
        <>
          <div style={card}>
            <p style={{ ...sageText, textAlign: 'center' }}>🕯️</p>
            <p style={{ ...smallText, marginTop: 6, textAlign: 'center' }}>
              {task.trim() ? `“${task.trim()}”` : 'Sage is here, quietly.'}
            </p>
            {checkins && <p style={{ ...smallText, marginTop: 4, textAlign: 'center', opacity: 0.7 }}>Gentle check-ins on</p>}
          </div>
          <div style={rowStyle}>
            <button type="button" onClick={end} style={primaryPill}>
              ⏹ End Companionship
            </button>
            {voice.speaking && (
              <button type="button" onClick={voice.stopSpeaking} style={pill}>
                ⏹ Stop voice
              </button>
            )}
            <span style={{ flex: '1 1 auto' }} />
            <button type="button" onClick={onBack} style={pill}>
              ← Back
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* --------------------------- Conversation Practice --------------------------- */

function RoleplayView({
  onBack,
  onExpressionChange,
}: {
  onBack: () => void;
  onExpressionChange: (expr: SageExpression | null) => void;
}) {
  const voice = useVoice();
  const [who, setWho] = useState('');
  const [about, setAbout] = useState('');
  const [live, setLive] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [turn, setTurn] = useState(0);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [wantsFeedback, setWantsFeedback] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    onExpressionChange('happy');
  }, [onExpressionChange]);
  useEffect(() => voice.stopSpeaking, [voice.stopSpeaking]);

  const speakIfOn = useCallback(
    (text: string) => {
      if (voice.voiceOn && voice.ttsSupported) voice.speak(text);
    },
    [voice],
  );

  const begin = useCallback(() => {
    if (!who.trim() || !about.trim()) return;
    setLive(true);
    setMessages([
      {
        id: nextId(),
        role: 'sage',
        text: aiAvailable
          ? `Got it — I’m ${who.trim()} now. You start whenever you’re ready.`
          : `Okay — I’ll play ${who.trim()}. AI roleplay isn’t available right now, so we’ll rehearse solo: you say your lines, and I’ll coach you through. Start whenever you’re ready.`,
      },
    ]);
    onExpressionChange('curious');
  }, [who, about, aiAvailable, onExpressionChange]);

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
        const history: ChatMessage[] = [
          {
            role: 'system',
            content: `You are roleplaying as ${who.trim() || 'the other person'} in a practice conversation about: ${about.trim() || 'an upcoming talk'}. Stay in character. Keep each reply to 1-3 sentences. React naturally, occasionally push back gently so the user can practice. Never break character to give advice.`,
          },
          ...messages.slice(-8).map((m) => ({
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

      await new Promise((r) => window.setTimeout(r, 500));
      const finalReply = reply ?? localRoleplayNudge(turn);
      setTurn((t) => t + 1);
      setMessages((m) => [...m, { id: nextId(), role: 'sage', text: finalReply as string }]);
      onExpressionChange('happy');
      speakIfOn(finalReply as string);
      setBusy(false);
      busyRef.current = false;
    },
    [messages, onExpressionChange, speakIfOn, turn, voice, who, about],
  );

  const giveFeedback = useCallback(async () => {
    setWantsFeedback(true);
    onExpressionChange('curious');
    let fb: string | null = null;
    try {
      const history: ChatMessage[] = [
        {
          role: 'system',
          content: `You are Sage, a kind communication coach. The user just rehearsed a conversation with ${who.trim() || 'someone'} about ${about.trim() || 'something'}. Give 2-3 sentences of warm, specific feedback: one strength, one gentle tip. No judgment.`,
        },
        ...messages.slice(-8).map((m) => ({
          role: (m.role === 'sage' ? 'assistant' : 'user') as 'assistant' | 'user',
          content: m.text,
        })),
        { role: 'user', content: 'How did I do? Any feedback?' },
      ];
      const res = await api.chat(history);
      if (res?.reply) {
        fb = res.reply;
        setAiAvailable(true);
      }
    } catch {
      setAiAvailable(false);
      fb = null;
    }
    const finalFb = fb ?? localFeedback();
    setFeedback(finalFb);
    onExpressionChange('happy');
    speakIfOn(finalFb);
  }, [messages, onExpressionChange, speakIfOn, who, about]);

  const toggleMic = useCallback(() => {
    if (voice.listening) {
      voice.stopListening();
      onExpressionChange('happy');
    } else {
      onExpressionChange('curious');
      voice.startListening((text) => setDraft(text));
    }
  }, [voice, onExpressionChange]);

  const resetAll = useCallback(() => {
    voice.stopListening();
    voice.stopSpeaking();
    setLive(false);
    setMessages([]);
    setDraft('');
    setTurn(0);
    setFeedback(null);
    setWantsFeedback(false);
    onExpressionChange('happy');
  }, [voice, onExpressionChange]);

  if (!live) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={card}>
          <p style={sageText}>🎭 Conversation Practice — Rehearse With Me</p>
          <p style={{ ...smallText, marginTop: 4 }}>Tell me who you’ll be talking to and what it’s about. I’ll play their part.</p>
          {!aiAvailable && <p style={{ ...smallText, marginTop: 4, opacity: 0.75 }}>Offline mode · full roleplay needs AI — solo rehearsal with coaching works now.</p>}
        </div>
        <input
          value={who}
          onChange={(e) => setWho(e.target.value)}
          placeholder="Who? e.g. my manager, a friend…"
          aria-label="Who are you talking to"
          style={inputStyle}
        />
        <input
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="What's it about? e.g. asking for Friday off…"
          aria-label="What is the conversation about"
          style={inputStyle}
        />
        <div style={rowStyle}>
          <button
            type="button"
            onClick={begin}
            disabled={!who.trim() || !about.trim()}
            style={{ ...primaryPill, opacity: !who.trim() || !about.trim() ? 0.5 : 1 }}
          >
            ▶ Start rehearsal
          </button>
          <span style={{ flex: '1 1 auto' }} />
          <button type="button" onClick={onBack} style={pill}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, flex: '1 1 auto' }}>
      <div style={card}>
        <p style={sageText}>
          🎭 Rehearsing with <span style={{ color: 'var(--accent-primary)' }}>{who.trim()}</span>
        </p>
        {!aiAvailable && <p style={{ ...smallText, marginTop: 4, opacity: 0.75 }}>Solo rehearsal · AI roleplay unavailable.</p>}
      </div>
      <ChatLog messages={messages} busy={busy} busyText={aiAvailable ? `${who.trim() || 'They'} are responding…` : 'Sage is coaching…'} />
      {voice.sttError && <p style={{ ...smallText, color: '#E8B4B8' }}>{voice.sttError}</p>}
      {wantsFeedback && feedback && (
        <div style={card}>
          <p style={{ ...smallText, fontWeight: 700, color: 'var(--accent-primary)' }}>Feedback 💜</p>
          <p style={{ ...sageText, marginTop: 4, fontSize: 'clamp(13px, 3vw, 15px)' }}>{feedback}</p>
        </div>
      )}
      <MicSendRow draft={draft} setDraft={setDraft} onSend={send} busy={busy} voice={voice} onToggleMic={toggleMic} placeholder="Say your line…" />
      <div style={rowStyle}>
        <VoiceRow voice={voice} onToggleMic={toggleMic} busy={busy} />
        {turn >= 2 && !wantsFeedback && (
          <button type="button" onClick={giveFeedback} style={pill}>
            💬 Give me feedback
          </button>
        )}
        <span style={{ flex: '1 1 auto' }} />
        <button type="button" onClick={resetAll} style={pill}>
          ↺ New scene
        </button>
        <button type="button" onClick={onBack} style={pill}>
          ← Back
        </button>
      </div>
    </div>
  );
}
