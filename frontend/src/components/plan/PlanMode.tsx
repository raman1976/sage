import { useCallback, useEffect, useRef, useState } from 'react';
import type { SageExpression } from '../../types';
import { api } from '../../services/api';
import { useVoice } from '../../hooks/useVoice';

interface PlanModeProps {
  onExit: () => void;
  onExpressionChange: (expr: SageExpression | null) => void;
  onStartFocus: (task: string) => void;
}

type PlanTab = 'breakdown' | 'decide' | 'momentum';
type StepStatus = 'todo' | 'done' | 'skipped';

interface PlanStep {
  id: string;
  text: string;
  status: StepStatus;
}

interface PlanSession {
  task: string;
  steps: PlanStep[];
}

interface DecideTask {
  id: string;
  text: string;
  urgency: 'low' | 'med' | 'high';
  effort: 'small' | 'med' | 'large';
  deadline: string;
}

interface Rec {
  taskId: string;
  why: string;
  source: 'ai' | 'rules';
}

interface PlanStore {
  session: PlanSession | null;
  decide: DecideTask[];
  selected: string;
}

const STORE_KEY = 'sage-plan';

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

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  flex: '0 1 auto',
  width: 'auto',
  padding: '8px 10px',
  fontSize: 12,
};

let uid = 1;
const nid = (p: string) => `${p}-${Date.now()}-${uid++}`;

function loadStore(): PlanStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { session: null, decide: [], selected: '' };
    const p = JSON.parse(raw) as Partial<PlanStore>;
    return {
      session: p.session && Array.isArray(p.session.steps) ? p.session : null,
      decide: Array.isArray(p.decide) ? p.decide : [],
      selected: typeof p.selected === 'string' ? p.selected : '',
    };
  } catch {
    return { session: null, decide: [], selected: '' };
  }
}

function parseSteps(text: string): string[] {
  return text
    .split(/\r?\n+/)
    .map((l) => l.replace(/^\s*(?:\d+[.)\-:]|[-*•])\s*/, '').trim())
    .filter((l) => l.length > 1)
    .slice(0, 5);
}

const BREAKDOWN_SYSTEM =
  'You break a task into 3-5 small, concrete, actionable steps for someone with ADHD. Reply with ONLY a numbered list, one step per line, no intro or outro. Each step must be completable in under 15 minutes.';

const STUCK_SYSTEM =
  'The user is stuck on one step of a task. Reply with ONLY 2-3 even smaller numbered sub-steps, one per line, no intro or outro. The very first one must take under 2 minutes.';

export const PlanMode = ({ onExit, onExpressionChange, onStartFocus }: PlanModeProps) => {
  const voice = useVoice();
  const [tab, setTab] = useState<PlanTab>('breakdown');
  const [store, setStore] = useState<PlanStore>(loadStore);
  const [taskDraft, setTaskDraft] = useState('');
  const [manualStep, setManualStep] = useState('');
  const [busy, setBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState(true);
  const [note, setNote] = useState("What's on your mind? Let's make it manageable.");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [decideText, setDecideText] = useState('');
  const [decideUrgency, setDecideUrgency] = useState<DecideTask['urgency']>('med');
  const [decideEffort, setDecideEffort] = useState<DecideTask['effort']>('med');
  const [decideDeadline, setDecideDeadline] = useState('');
  const [rec, setRec] = useState<Rec | null>(null);
  const busyRef = useRef(false);
  const flashTimer = useRef<number | null>(null);

  useEffect(() => {
    onExpressionChange('happy');
    return () => {
      onExpressionChange(null);
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    };
  }, [onExpressionChange]);
  useEffect(() => voice.stopSpeaking, [voice.stopSpeaking]);

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

  const flashExcited = useCallback(
    (ms = 1500) => {
      onExpressionChange('excited');
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => {
        onExpressionChange('happy');
        flashTimer.current = null;
      }, ms);
    },
    [onExpressionChange],
  );

  const currentIndex = (() => {
    if (!store.session) return -1;
    return store.session.steps.findIndex((s) => s.status === 'todo');
  })();
  const currentStep = store.session && currentIndex >= 0 ? store.session.steps[currentIndex] : null;
  const doneCount = store.session ? store.session.steps.filter((s) => s.status === 'done').length : 0;
  const totalCount = store.session ? store.session.steps.length : 0;

  const selectTask = useCallback((text: string) => {
    setStore((s) => ({ ...s, selected: text }));
  }, []);

  /* ------------------------------- breakdown -------------------------------- */

  const breakdown = useCallback(
    async (taskText: string) => {
      const task = taskText.trim();
      if (!task || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setAiError(null);
      onExpressionChange('curious');
      voice.stopListening();
      try {
        const res = await api.chat([
          { role: 'system', content: BREAKDOWN_SYSTEM },
          { role: 'user', content: task },
        ]);
        const steps = res?.reply ? parseSteps(res.reply) : [];
        if (steps.length < 2) throw new Error('Unusable breakdown');
        setAiAvailable(true);
        setStore((s) => ({
          ...s,
          session: { task, steps: steps.map((t, i) => ({ id: nid(`s${i}`), text: t, status: 'todo' as StepStatus })) },
          selected: task,
        }));
        setRec(null);
        const msg = `Broke “${task}” into ${steps.length} small steps. First up: ${steps[0]}`;
        setNote(msg);
        onExpressionChange('happy');
        speakIfOn(msg);
      } catch {
        setAiAvailable(false);
        setAiError('AI unavailable — I can’t break this down right now. Add steps manually below, one at a time.');
        onExpressionChange('happy');
      }
      setBusy(false);
      busyRef.current = false;
    },
    [onExpressionChange, speakIfOn, voice],
  );

  const regenerate = useCallback(async () => {
    if (!store.session || busyRef.current) return;
    await breakdown(store.session.task);
  }, [store.session, breakdown]);

  const addManualStep = useCallback(() => {
    const text = manualStep.trim();
    if (!text) return;
    const baseTask = store.session?.task || taskDraft.trim() || 'My task';
    setStore((s) => ({
      ...s,
      session: {
        task: s.session?.task ?? baseTask,
        steps: [...(s.session?.steps ?? []), { id: nid('m'), text, status: 'todo' as StepStatus }],
      },
      selected: s.selected || baseTask,
    }));
    setManualStep('');
    setAiError(null);
  }, [manualStep, store.session, taskDraft]);

  const completeStep = useCallback(
    (id: string) => {
      setStore((s) => {
        if (!s.session) return s;
        return { ...s, session: { ...s.session, steps: s.session.steps.map((st) => (st.id === id ? { ...st, status: 'done' as StepStatus } : st)) } };
      });
      flashExcited(1500);
      const remaining = store.session?.steps.filter((st) => st.status === 'todo' && st.id !== id) ?? [];
      const msg =
        remaining.length > 0
          ? `Done! Beautiful. 🎉 Next tiny step: ${remaining[0].text}`
          : 'All steps complete — look at you go! 🎉 Want to start something new?';
      setNote(msg);
      speakIfOn(msg);
    },
    [store.session, flashExcited, speakIfOn],
  );

  const skipStep = useCallback((id: string) => {
    setStore((s) => {
      if (!s.session) return s;
      return { ...s, session: { ...s.session, steps: s.session.steps.map((st) => (st.id === id ? { ...st, status: 'skipped' as StepStatus } : st)) } };
    });
  }, []);

  const saveEdit = useCallback(
    (id: string) => {
      const text = editText.trim();
      if (!text) return;
      setStore((s) => {
        if (!s.session) return s;
        return { ...s, session: { ...s.session, steps: s.session.steps.map((st) => (st.id === id ? { ...st, text } : st)) } };
      });
      setEditingId(null);
      setEditText('');
    },
    [editText],
  );

  const stuckOn = useCallback(
    async (step: { id: string; text: string }) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setAiError(null);
      onExpressionChange('curious');
      try {
        const res = await api.chat([
          { role: 'system', content: STUCK_SYSTEM },
          { role: 'user', content: `I'm stuck on this step: ${step.text}` },
        ]);
        const subs = res?.reply ? parseSteps(res.reply) : [];
        if (subs.length < 2) throw new Error('Unusable split');
        setAiAvailable(true);
        setStore((s) => {
          if (!s.session) return s;
          const idx = s.session.steps.findIndex((st) => st.id === step.id);
          const insert = subs.map((t, i) => ({ id: nid(`sub${i}`), text: t, status: 'todo' as StepStatus }));
          const steps = [...s.session.steps];
          steps.splice(idx + 1, 0, ...insert);
          return { ...s, session: { ...s.session, steps: steps.slice(0, 12) } };
        });
        const msg = `Let’s make that one easier. I split it into smaller moves — start with: ${subs[0]}`;
        setNote(msg);
        onExpressionChange('happy');
        speakIfOn(msg);
      } catch {
        setAiAvailable(false);
        const msg = 'I can’t split that with AI right now — but tell me which part feels hardest, or add an easier first move below.';
        setAiError(msg);
        setNote(msg);
        onExpressionChange('happy');
      }
      setBusy(false);
      busyRef.current = false;
    },
    [onExpressionChange, speakIfOn],
  );

  const clearSession = useCallback(() => {
    setStore((s) => ({ ...s, session: null }));
    setRec(null);
    setAiError(null);
  }, []);

  /* --------------------------------- decide ---------------------------------- */

  const addDecideTask = useCallback(() => {
    const text = decideText.trim();
    if (!text) return;
    setStore((s) => ({
      ...s,
      decide: [...s.decide, { id: nid('d'), text, urgency: decideUrgency, effort: decideEffort, deadline: decideDeadline.trim() }].slice(0, 12),
    }));
    setDecideText('');
    setDecideDeadline('');
    setRec(null);
  }, [decideText, decideUrgency, decideEffort, decideDeadline]);

  const removeDecideTask = useCallback((id: string) => {
    setStore((s) => ({ ...s, decide: s.decide.filter((t) => t.id !== id) }));
    setRec((r) => (r && r.taskId === id ? null : r));
  }, []);

  const scoreTask = (t: DecideTask): number => {
    const u = t.urgency === 'high' ? 3 : t.urgency === 'med' ? 2 : 1;
    const e = t.effort === 'small' ? 2 : t.effort === 'med' ? 1 : 0;
    return u * 3 + (t.deadline ? 2 : 0) + e;
  };

  const recommend = useCallback(async () => {
    const tasks = store.decide;
    if (tasks.length === 0 || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setAiError(null);
    onExpressionChange('curious');
    try {
      const listing = tasks
        .map((t, i) => `${i + 1}. ${t.text} (urgency: ${t.urgency}, effort: ${t.effort}${t.deadline ? `, deadline: ${t.deadline}` : ''})`)
        .join('\n');
      const res = await api.chat([
        {
          role: 'system',
          content:
            'You help someone with ADHD pick ONE task to start with, weighing urgency, deadlines, and effort. Reply in exactly this format:\nCHOICE: <the exact task text>\nWHY: <one short sentence>',
        },
        { role: 'user', content: `My tasks:\n${listing}` },
      ]);
      const reply = res?.reply ?? '';
      const choice = /CHOICE:\s*(.+)/i.exec(reply)?.[1]?.trim() ?? '';
      const why = /WHY:\s*(.+)/i.exec(reply)?.[1]?.trim() ?? 'It looks like the best place to start.';
      const match =
        tasks.find((t) => choice && (t.text.toLowerCase().includes(choice.toLowerCase()) || choice.toLowerCase().includes(t.text.toLowerCase()))) ??
        tasks[0];
      setAiAvailable(true);
      setRec({ taskId: match.id, why, source: 'ai' });
      selectTask(match.text);
      const msg = `I’d start with “${match.text}”. ${why}`;
      setNote(msg);
      onExpressionChange('happy');
      speakIfOn(msg);
    } catch {
      setAiAvailable(false);
      const ranked = [...tasks].sort((a, b) => scoreTask(b) - scoreTask(a));
      const top = ranked[0];
      const reasons: string[] = [];
      if (top.urgency === 'high') reasons.push('highest urgency');
      else if (top.urgency === 'med') reasons.push('solid urgency');
      if (top.deadline) reasons.push(`deadline “${top.deadline}”`);
      if (top.effort === 'small') reasons.push('small effort — an easy win');
      const why = `Offline suggestion (rule-based): ${reasons.slice(0, 2).join(' + ') || 'balanced pick'}.`;
      setRec({ taskId: top.id, why, source: 'rules' });
      selectTask(top.text);
      const msg = `AI is unavailable, so here’s my rule-based suggestion: start with “${top.text}”. ${why}`;
      setNote(msg);
      onExpressionChange('happy');
      speakIfOn(`Start with ${top.text}. ${why}`);
    }
    setBusy(false);
    busyRef.current = false;
  }, [store.decide, onExpressionChange, selectTask, speakIfOn]);

  /* ---------------------------------- voice ---------------------------------- */

  const toggleMicTask = useCallback(() => {
    if (voice.listening) {
      voice.stopListening();
      onExpressionChange('happy');
    } else {
      onExpressionChange('curious');
      voice.startListening((text) => setTaskDraft((d) => (d ? `${d} ${text}` : text)));
    }
  }, [voice, onExpressionChange]);

  const toggleVoice = useCallback(() => {
    if (!voice.voiceOn) voice.setVoiceOn(true);
    else {
      voice.setVoiceOn(false);
      voice.stopSpeaking();
    }
  }, [voice]);

  /* ---------------------------------- render --------------------------------- */

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
        <p style={sageText}>🗺️ Plan Mode</p>
        <p style={{ ...sageText, marginTop: 4 }}>{note}</p>
        {!aiAvailable && (
          <p style={{ ...smallText, marginTop: 6, opacity: 0.75 }}>
            Offline mode · AI breakdowns unavailable · your lists stay on this device.
          </p>
        )}
      </div>

      <div style={rowStyle} role="tablist" aria-label="Plan sections">
        {(['breakdown', 'decide', 'momentum'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            style={tab === t ? primaryPill : pill}
          >
            {t === 'breakdown' ? '🧩 Break Down' : t === 'decide' ? '⚖️ Decide' : '🚀 Momentum'}
          </button>
        ))}
      </div>

      {aiError && (
        <div style={{ ...card, border: '1px solid rgba(255,179,167,0.5)' }}>
          <p style={{ ...smallText, color: '#E8B4B8' }}>{aiError}</p>
        </div>
      )}

      {tab === 'breakdown' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={taskDraft}
              onChange={(e) => setTaskDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  breakdown(taskDraft);
                }
              }}
              placeholder="What task feels big? e.g. clean the kitchen…"
              aria-label="Task to break down"
              disabled={busy}
              style={inputStyle}
            />
            <button
              type="button"
              onClick={toggleMicTask}
              disabled={busy}
              aria-label={voice.listening ? 'Stop dictation' : 'Dictate task'}
              style={{
                ...pill,
                flex: '0 0 auto',
                padding: '10px 14px',
                background: voice.listening ? 'rgba(255,179,167,0.18)' : 'rgba(255,255,255,0.05)',
              }}
            >
              {voice.listening ? '⏹' : '🎙️'}
            </button>
            <button
              type="button"
              onClick={() => breakdown(taskDraft)}
              disabled={busy || !taskDraft.trim()}
              style={{ ...primaryPill, flex: '0 0 auto', opacity: busy || !taskDraft.trim() ? 0.5 : 1 }}
            >
              {busy ? '…' : 'Break it down'}
            </button>
          </div>
          {voice.sttError && <p style={{ ...smallText, color: '#E8B4B8' }}>{voice.sttError}</p>}

          {store.session && (
            <div style={card}>
              <p style={{ ...smallText, fontWeight: 700, color: 'var(--text-primary)' }}>
                “{store.session.task}” · {doneCount}/{totalCount} done
              </p>
              <div
                style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.10)', marginTop: 8, overflow: 'hidden' }}
                role="progressbar"
                aria-valuenow={totalCount ? Math.round((doneCount / totalCount) * 100) : 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Step progress"
              >
                <div
                  style={{
                    height: '100%',
                    width: `${totalCount ? Math.round((doneCount / totalCount) * 100) : 0}%`,
                    borderRadius: 4,
                    background: 'linear-gradient(90deg, var(--accent-primary), #8F7AD6)',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              {currentStep && (
                <div
                  style={{
                    marginTop: 10,
                    padding: '12px 14px',
                    borderRadius: 14,
                    background: 'rgba(185,161,221,0.12)',
                    border: '1px solid var(--accent-primary)',
                  }}
                >
                  <p style={{ ...smallText, opacity: 0.8 }}>👉 Right now, just this:</p>
                  <p style={{ ...sageText, marginTop: 4, fontWeight: 700 }}>{currentStep.text}</p>
                  <div style={{ ...rowStyle, marginTop: 10 }}>
                    <button type="button" onClick={() => completeStep(currentStep.id)} style={primaryPill}>
                      ✓ Complete
                    </button>
                    <button type="button" onClick={() => skipStep(currentStep.id)} style={pill}>
                      Skip →
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(currentStep.id);
                        setEditText(currentStep.text);
                      }}
                      style={pill}
                    >
                      ✎ Edit
                    </button>
                    <button type="button" onClick={() => stuckOn(currentStep)} disabled={busy} style={pill}>
                      😟 I&apos;m stuck
                    </button>
                  </div>
                  {editingId === currentStep.id && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        aria-label="Edit step"
                        style={inputStyle}
                      />
                      <button type="button" onClick={() => saveEdit(currentStep.id)} style={primaryPill}>
                        Save
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!currentStep && totalCount > 0 && (
                <p style={{ ...sageText, marginTop: 10 }}>All steps handled — beautifully done! 🎉</p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {store.session.steps.map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'center', opacity: s.status === 'todo' ? 1 : 0.55 }}>
                    <span style={{ ...smallText, flex: '0 0 auto', width: 22 }}>{s.status === 'done' ? '✓' : s.status === 'skipped' ? '→' : `${i + 1}.`}</span>
                    {editingId === s.id ? (
                      <>
                        <input value={editText} onChange={(e) => setEditText(e.target.value)} aria-label="Edit step" style={{ ...inputStyle, padding: '8px 12px', fontSize: 13 }} />
                        <button type="button" onClick={() => saveEdit(s.id)} style={primaryPill}>
                          Save
                        </button>
                      </>
                    ) : (
                      <>
                        <p style={{ ...smallText, flex: '1 1 auto', color: 'var(--text-primary)', textDecoration: s.status === 'done' ? 'line-through' : 'none' }}>
                          {s.text}
                        </p>
                        {s.status === 'todo' && (
                          <>
                            <button type="button" onClick={() => completeStep(s.id)} style={pill} aria-label="Complete step">
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(s.id);
                                setEditText(s.text);
                              }}
                              style={pill}
                              aria-label="Edit step"
                            >
                              ✎
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  value={manualStep}
                  onChange={(e) => setManualStep(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addManualStep();
                    }
                  }}
                  placeholder="Add your own step…"
                  aria-label="Add your own step"
                  style={{ ...inputStyle, padding: '8px 12px', fontSize: 13 }}
                />
                <button type="button" onClick={addManualStep} disabled={!manualStep.trim()} style={{ ...pill, flex: '0 0 auto', opacity: !manualStep.trim() ? 0.5 : 1 }}>
                  ＋ Add
                </button>
              </div>

              <div style={{ ...rowStyle, marginTop: 10 }}>
                <button type="button" onClick={regenerate} disabled={busy} style={pill}>
                  ↺ Regenerate
                </button>
                <button type="button" onClick={clearSession} style={pill}>
                  🗑 New task
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'decide' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={smallText}>List what’s pulling at you. I’ll weigh urgency, deadlines, and effort — then suggest one place to start. You always get the final say.</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <input
              value={decideText}
              onChange={(e) => setDecideText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addDecideTask();
                }
              }}
              placeholder="Another thing on your mind…"
              aria-label="Add a task to decide between"
              style={{ ...inputStyle, flex: '1 1 140px' }}
            />
            <select value={decideUrgency} onChange={(e) => setDecideUrgency(e.target.value as DecideTask['urgency'])} aria-label="Urgency" style={selectStyle}>
              <option value="low">Calm urgency</option>
              <option value="med">Medium urgency</option>
              <option value="high">High urgency</option>
            </select>
            <select value={decideEffort} onChange={(e) => setDecideEffort(e.target.value as DecideTask['effort'])} aria-label="Effort" style={selectStyle}>
              <option value="small">Small effort</option>
              <option value="med">Medium effort</option>
              <option value="large">Large effort</option>
            </select>
            <input
              value={decideDeadline}
              onChange={(e) => setDecideDeadline(e.target.value)}
              placeholder="Deadline?"
              aria-label="Deadline (optional)"
              style={{ ...inputStyle, flex: '0 1 110px' }}
            />
            <button type="button" onClick={addDecideTask} disabled={!decideText.trim()} style={{ ...primaryPill, flex: '0 0 auto', opacity: !decideText.trim() ? 0.5 : 1 }}>
              ＋ Add
            </button>
          </div>

          {store.decide.map((t) => (
            <div key={t.id} style={{ ...card, display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                <p style={{ ...smallText, color: 'var(--text-primary)' }}>{t.text}</p>
                <p style={{ ...smallText, marginTop: 2, opacity: 0.7, fontSize: 12 }}>
                  {t.urgency} urgency · {t.effort} effort{t.deadline ? ` · due ${t.deadline}` : ''}
                </p>
              </div>
              <button type="button" onClick={() => { selectTask(t.text); setNote(`Your call — starting with “${t.text}”. I’m with you.`); }} style={pill} aria-label="Start this instead">
                Start this
              </button>
              <button type="button" onClick={() => removeDecideTask(t.id)} style={pill} aria-label="Remove task">
                ✕
              </button>
            </div>
          ))}

          {store.decide.length > 0 && (
            <div style={rowStyle}>
              <button type="button" onClick={recommend} disabled={busy} style={primaryPill}>
                {busy ? '…' : '✨ Recommend one'}
              </button>
            </div>
          )}

          {rec && (
            <div style={{ ...card, border: '1px solid var(--accent-primary)' }}>
              <p style={{ ...smallText, fontWeight: 700, color: 'var(--accent-primary)' }}>
                {rec.source === 'ai' ? 'Sage suggests 💜' : 'Sage suggests (offline rules) 💜'}
              </p>
              <p style={{ ...sageText, marginTop: 4 }}>
                “{store.decide.find((t) => t.id === rec.taskId)?.text ?? ''}” — {rec.why}
              </p>
              <div style={{ ...rowStyle, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    const t = store.decide.find((x) => x.id === rec.taskId);
                    if (t) {
                      selectTask(t.text);
                      setNote(`Locked in: “${t.text}”. Small steps, big you.`);
                    }
                  }}
                  style={primaryPill}
                >
                  ✓ Go with this
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'momentum' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={card}>
            <p style={{ ...smallText, fontWeight: 700, color: 'var(--accent-primary)' }}>🚀 Momentum Keeper</p>
            {store.selected ? (
              <>
                <p style={{ ...sageText, marginTop: 4 }}>Current focus: “{store.selected}”</p>
                {currentStep && store.session && store.session.task === store.selected ? (
                  <p style={{ ...sageText, marginTop: 6 }}>
                    Next tiny action: <strong>{currentStep.text}</strong>
                  </p>
                ) : (
                  <p style={{ ...smallText, marginTop: 6 }}>
                    No next action lined up. Break it down first, then come back here.
                  </p>
                )}
              </>
            ) : (
              <p style={{ ...smallText, marginTop: 4 }}>
                Nothing selected yet — break down a task or pick one in Decide, and I’ll keep you moving.
              </p>
            )}
          </div>
          <div style={rowStyle}>
            {currentStep && store.session && store.session.task === store.selected && (
              <>
                <button type="button" onClick={() => completeStep(currentStep.id)} style={primaryPill}>
                  ✓ Did it!
                </button>
                <button type="button" onClick={() => stuckOn(currentStep)} disabled={busy} style={pill}>
                  😟 I&apos;m stuck
                </button>
              </>
            )}
            {store.selected && (
              <button type="button" onClick={() => onStartFocus(store.selected)} style={primaryPill}>
                🍃 Start Focus Session
              </button>
            )}
            {(!currentStep || !store.session || store.session.task !== store.selected) && (
              <button type="button" onClick={() => setTab('breakdown')} style={pill}>
                🧩 Break it down
              </button>
            )}
          </div>
        </div>
      )}

      <div style={rowStyle}>
        {voice.ttsSupported && (
          <button type="button" onClick={toggleVoice} aria-label={voice.voiceOn ? 'Mute Sage voice' : 'Unmute Sage voice'} style={pill}>
            {voice.voiceOn ? '🔊 Voice on' : '🔇 Muted'}
          </button>
        )}
        {voice.speaking && (
          <button type="button" onClick={voice.stopSpeaking} style={pill}>
            ⏹ Stop voice
          </button>
        )}
        <span style={{ flex: '1 1 auto' }} />
        <button type="button" onClick={onExit} style={{ ...pill, opacity: 0.85 }}>
          ↩ Exit Plan
        </button>
      </div>
    </div>
  );
};

PlanMode.displayName = 'PlanMode';
