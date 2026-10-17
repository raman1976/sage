import { motion } from 'motion/react';
import type { SageMode, SageExpression } from '../../types';
import { MODE_BUTTONS } from '../../types';
import { Character, nextAvatar, type SageAvatar } from '../character';
import { CalmMode } from '../calm';
import { CompanionMode } from '../companion';
import { FocusMode } from '../focus';
import { PlanMode } from '../plan';
import { Header, ModeButton } from '../ui';
import { VoiceAssistant, VoiceSettings, type VoiceUiState } from '../voice';
import { MusicPlayer } from '../music';
import { useMusicPlayer } from '../../hooks/useMusicPlayer';
import { useVoice } from '../../hooks/useVoice';
import { useSageChat } from '../../hooks/useSageChat';
import { useModeSuggestion, matchConfirmation, parseExplicitModeSwitch, type PendingSuggestion } from '../../hooks/useModeSuggestion';
import { useState, useCallback, useRef, useEffect } from 'react';
import backgroundImage from '../../assets/background.png';

interface MainScreenProps {
  currentMode: SageMode;
  onModeChange: (mode: SageMode) => void;
  onSendMessage: (message: string) => void;
  isConnected: boolean;
}

/** "Sage!" heading color, matched to the selected character avatar. */
const AVATAR_HEADING_COLORS: Record<SageAvatar, string> = {
  lavender: '#b9a1dd', // purple
  cat: '#f6a9c9', // pink
  bee: '#ffd23f', // golden yellow
  ladybug: '#e23b34', // red
};

/* ---------------- ambient decorations (stars / hearts / sparkles) ---------- */

function AmbientDecor() {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const items = [
    { top: '12%', left: '6%', size: 8, delay: 0, char: '✦', color: '#e8dff8' },
    { top: '22%', left: '88%', size: 6, delay: 1.2, char: '✦', color: '#ffd166' },
    { top: '65%', left: '4%', size: 7, delay: 2.1, char: '♡', color: '#ffc7d8' },
    { top: '78%', left: '92%', size: 6, delay: 0.6, char: '✦', color: '#b9a1dd' },
    { top: '40%', left: '2%', size: 5, delay: 1.8, char: '✧', color: '#e8dff8' },
    { top: '15%', left: '42%', size: 5, delay: 2.5, char: '✦', color: '#b9a1dd' },
    { top: '85%', left: '35%', size: 4, delay: 0.3, char: '✧', color: '#ffd166' },
  ];

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden',
      }}
    >
      {items.map((item, i) => (
        <span
          key={i}
          className={reduced ? undefined : 'sage-decor'}
          style={{
            position: 'absolute',
            top: item.top,
            left: item.left,
            fontSize: item.size,
            color: item.color,
            opacity: 0.55,
            textShadow: `0 0 ${item.size * 2}px ${item.color}`,
            animationDelay: `${item.delay}s`,
            animationDuration: `${3.5 + i * 0.4}s`,
          }}
        >
          {item.char}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------ main screen ------------------------------- */

export const MainScreen = ({
  currentMode,
  onModeChange,
  onSendMessage,
  isConnected,
}: MainScreenProps) => {
  const [inputValue, setInputValue] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [expressionOverride, setExpressionOverride] = useState<SageExpression | null>(null);
  const [calmExpression, setCalmExpression] = useState<SageExpression | null>(null);
  const [companionExpression, setCompanionExpression] = useState<SageExpression | null>(null);
  const [planExpression, setPlanExpression] = useState<SageExpression | null>(null);
  const [focusExpression, setFocusExpression] = useState<SageExpression | null>(null);
  const [focusTask, setFocusTask] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [avatar, setAvatar] = useState<SageAvatar>('bee');
  const [voiceExpression, setVoiceExpression] = useState<SageExpression | null>(null);
  const overrideTimerRef = useRef<number | null>(null);
  // Latest home submitter for the continuous voice loop (outlives closures).
  const homeSubmitRef = useRef<(value: string) => Promise<void>>(async () => {});

  const music = useMusicPlayer(currentMode);
  const voice = useVoice();
  const chat = useSageChat();
  const suggest = useModeSuggestion();
  const [modeEntryContext, setModeEntryContext] = useState<string | null>(null);

  const handleConsumeEntryContext = useCallback(() => {
    setModeEntryContext(null);
  }, []);

  const voiceUiState: VoiceUiState = voice.listening
    ? 'listening'
    : voice.speaking
      ? 'speaking'
      : chat.status === 'thinking'
        ? 'thinking'
        : 'idle';

  // Voice ducking: lower music while Sage listens or speaks via speechSynthesis
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    let wasDucked = false;
    const check = () => {
      const speaking = window.speechSynthesis.speaking || voice.listening;
      if (speaking && !wasDucked) {
        music.duckVolume(true);
        wasDucked = true;
      } else if (!speaking && wasDucked) {
        music.duckVolume(false);
        wasDucked = false;
      }
    };
    const interval = window.setInterval(check, 200);
    return () => {
      window.clearInterval(interval);
      if (wasDucked) music.duckVolume(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [music, voice.listening]);

  // Return Sage's face to idle shortly after a voice interaction fully ends.
  const voiceActive = voice.listening || voice.speaking || chat.status === 'thinking';
  useEffect(() => {
    if (voiceActive || !voiceExpression) return;
    const t = window.setTimeout(() => setVoiceExpression(null), 1500);
    return () => window.clearTimeout(t);
  }, [voiceActive, voiceExpression]);

  /* ---- Home chat session: fresh after 30s idle (React state only) ---- */
  const INACTIVITY_MS = 30000;
  const inactivityTimerRef = useRef<number | null>(null);

  const startNewHomeSession = useCallback(() => {
    chat.startNewSession();
    suggest.clearSuggestion();
    setInputValue('');
    setShowWelcome(true);
    setVoiceExpression(null);
  }, [chat.startNewSession, suggest.clearSuggestion]);

  // Latest-state gate so the timeout never clears mid-thought or mid-speech.
  const sessionResetGateRef = useRef({ busy: false });
  sessionResetGateRef.current.busy = voice.listening || voice.speaking || chat.status === 'thinking';

  const scheduleInactivityReset = useCallback(() => {
    if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = window.setTimeout(() => {
      if (sessionResetGateRef.current.busy) {
        // Nemotron generating or Sage speaking/listening — defer, never drop.
        scheduleInactivityReset();
        return;
      }
      startNewHomeSession();
      scheduleInactivityReset();
    }, INACTIVITY_MS);
  }, [startNewHomeSession]);

  useEffect(() => {
    scheduleInactivityReset();
    return () => {
      if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
    };
  }, [scheduleInactivityReset]);

  const isCalm = currentMode === 'calm';
  const isCompanion = currentMode === 'companion';
  const isPlan = currentMode === 'plan';
  const isFocus = currentMode === 'focus';
  const isHome = !isCalm && !isCompanion && !isPlan && !isFocus;

  const handleBackToHome = useCallback(() => {
    voice.stopContinuous();
    setCalmExpression(null);
    setCompanionExpression(null);
    setPlanExpression(null);
    setFocusExpression(null);
    setFocusTask(null);
    setModeEntryContext(null);
    suggest.clearSuggestion();
    onModeChange('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onModeChange]);

  const flashExpression = useCallback((expr: SageExpression, durationMs: number) => {
    if (overrideTimerRef.current) {
      window.clearTimeout(overrideTimerRef.current);
      overrideTimerRef.current = null;
    }
    setExpressionOverride(expr);
    overrideTimerRef.current = window.setTimeout(() => {
      setExpressionOverride(null);
      overrideTimerRef.current = null;
    }, durationMs);
  }, []);

  useEffect(() => () => {
    if (overrideTimerRef.current) window.clearTimeout(overrideTimerRef.current);
  }, []);

  const handleInputChange = useCallback((value: string) => {
    if (!isCalm && !isCompanion && !isPlan && !isFocus && value.trim()) {
      flashExpression('excited', 1300);
    }
    setInputValue(value);
    scheduleInactivityReset();
  }, [flashExpression, isCalm, isCompanion, isPlan, isFocus, scheduleInactivityReset]);

  /** Home text/voice chat: direct switch → suggestion answer → Nemotron → maybe suggest. */
  const handleHomeSubmit = useCallback(async (value: string) => {
    const text = value.trim();
    if (!text) return;
    scheduleInactivityReset();

    // 1. Explicit command ("switch to calm mode") — a direct instruction,
    // not a suggestion. Navigate immediately, backend or not.
    const direct = parseExplicitModeSwitch(text);
    if (direct) {
      suggest.clearSuggestion();
      suggest.noteUserMessage();
      onSendMessage(text);
      setInputValue('');
      setShowWelcome(false);
      const prevUser = [...chat.messages].reverse().find((m) => m.role === 'user');
      confirmSuggestion({ mode: direct, context: prevUser?.content ?? text, askLine: '' });
      return;
    }

    // 2. A pending suggestion gets next dibs — "yes"/"no" only dismiss
    // the card and continue chatting. Suggestions NEVER navigate, not even
    // on "yes": only an explicit switch command (step 1) or a mode card
    // click may change modes.
    if (suggest.suggestion) {
      const verdict = matchConfirmation(text);
      if (verdict === 'yes' || verdict === 'no') {
        suggest.declineSuggestion();
        // fall through: keep chatting normally
      }
    }
    suggest.noteUserMessage();

    onSendMessage(text);
    setInputValue('');
    setShowWelcome(false);
    const reply = await chat.send(text);
    if (reply) {
      if (voice.voiceOn && voice.autoSpeak && voice.ttsSupported) {
        setVoiceExpression('happy');
        voice.speak(reply);
      } else {
        setVoiceExpression('happy');
      }
      // Ask Nemotron (fire-and-forget) whether a mode would help here.
      const hist = [
        ...chat.messages.slice(-7).map(({ role, content }) => ({ role, content })),
        { role: 'user' as const, content: text },
        { role: 'assistant' as const, content: reply },
      ].slice(-8);
      void suggest.maybeSuggest(hist, text);
    } else {
      setVoiceExpression('calm');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSendMessage, chat.send, chat.messages, voice.voiceOn, voice.autoSpeak, voice.ttsSupported, voice.speak, suggest.suggestion, suggest.declineSuggestion, suggest.noteUserMessage, suggest.maybeSuggest]);

  homeSubmitRef.current = handleHomeSubmit;

  // Each resumed continuous turn shows the listening face again.
  useEffect(() => {
    if (voice.continuous && voice.listening) setVoiceExpression('curious');
  }, [voice.continuous, voice.listening]);

  /** Navigate on explicit switch commands, carrying conversation context along. */
  const confirmSuggestion = useCallback((taken: PendingSuggestion) => {
    voice.stopSpeaking();
    voice.stopListening();
    voice.stopContinuous();
    setVoiceExpression(null);
    if (taken.mode === 'focus') {
      handleStartFocus(taken.context);
      return;
    }
    setModeEntryContext(taken.context);
    setCalmExpression(null);
    setCompanionExpression(null);
    setPlanExpression(null);
    setFocusExpression(null);
    onModeChange(taken.mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onModeChange, voice.stopSpeaking, voice.stopListening, voice.stopContinuous]);

  /** Mic toggle: enter/exit continuous hands-free mode. Stops speech first. */
  const handleMicToggle = useCallback(() => {
    scheduleInactivityReset();
    if (voice.continuous || voice.listening) {
      voice.stopSpeaking();
      voice.stopContinuous();
      return;
    }
    if (voice.speaking) {
      voice.stopSpeaking();
      return;
    }
    if (chat.status === 'thinking') return; // one AI request at a time
    setVoiceExpression('curious');
    voice.startContinuous((spoken: string) => {
      // Latest submitter via ref (continuous loop outlives render closures).
      homeSubmitRef.current(spoken);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.continuous, voice.listening, voice.speaking, chat.status, voice.stopSpeaking, voice.stopContinuous, voice.startContinuous]);

  const handleModeClick = useCallback((mode: SageMode) => {
    if (mode !== currentMode) {
      voice.stopContinuous();
      setCalmExpression(null);
      setCompanionExpression(null);
      setPlanExpression(null);
      setFocusExpression(null);
      setModeEntryContext(null);
      suggest.clearSuggestion();
      onModeChange(mode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMode, onModeChange]);

  const handleCalmExit = useCallback(() => {
    setCalmExpression(null);
    onModeChange('idle');
  }, [onModeChange]);

  const handleCompanionExit = useCallback(() => {
    setCompanionExpression(null);
    onModeChange('idle');
  }, [onModeChange]);

  const handlePlanExit = useCallback(() => {
    setPlanExpression(null);
    onModeChange('idle');
  }, [onModeChange]);

  const handleFocusExit = useCallback(() => {
    setFocusExpression(null);
    onModeChange('idle');
  }, [onModeChange]);

  const handleStartFocus = useCallback((task: string) => {
    voice.stopContinuous();
    setPlanExpression(null);
    setFocusExpression(null);
    setFocusTask(task);
    onModeChange('focus');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onModeChange]);

  const handleConsumeFocusTask = useCallback(() => {
    setFocusTask(null);
  }, []);

  const effectiveExpression = expressionOverride ?? voiceExpression ?? calmExpression ?? companionExpression ?? planExpression ?? focusExpression ?? undefined;

  return (
    <motion.div
      style={{
        position: 'relative',
        width: '100dvw',
        height: '100dvh',
        maxWidth: '100dvw',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-main)',
        backgroundImage: `linear-gradient(180deg, rgba(8,6,16,0.42) 0%, rgba(8,6,16,0.28) 45%, rgba(8,6,16,0.58) 100%), url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        fontFamily: 'var(--font-body)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* ambient background gradients */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 55% 45% at 12% 20%, rgba(185,161,221,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 45% 35% at 85% 25%, rgba(185,161,221,0.06) 0%, transparent 55%),
            radial-gradient(ellipse 40% 30% at 50% 90%, rgba(185,161,221,0.04) 0%, transparent 50%),
            radial-gradient(ellipse 30% 25% at 75% 80%, rgba(255,179,167,0.03) 0%, transparent 50%)
          `,
          pointerEvents: 'none',
        }}
      />

      {/* floating decorations */}
      <AmbientDecor />

      {/* bottom gradient fade */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 'clamp(60px, 18vh, 100px)',
          background: 'linear-gradient(180deg, transparent 0%, rgba(8,6,16,0.28) 55%, rgba(8,6,16,0.55) 100%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <Header
        onSettingsClick={() => setSettingsOpen(true)}
        onCustomizeClick={() => setAvatar((a) => nextAvatar(a))}
        onLogoClick={handleBackToHome}
        logoColor={AVATAR_HEADING_COLORS[avatar]}
      />
      <VoiceSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} voice={voice} />

      <main
        style={{
          position: 'relative',
          display: 'flex',
          height: '100%',
          padding: 'calc(clamp(24px, 5vh, 40px) + var(--safe-top, 0px)) clamp(8px, 2vw, 24px) calc(clamp(4px, 1.5vh, 12px) + var(--safe-bottom, 0px)) calc(clamp(6px, 2vw, 16px) + var(--safe-left, 0px))',
          boxSizing: 'border-box',
          alignItems: 'stretch',
          justifyContent: 'space-between',
          gap: 'clamp(4px, 1vw, 16px)',
          overflow: 'hidden',
        }}
      >
        {/* ---- LEFT COLUMN: character + music player ---- */}
        <div
          style={{
            flex: '0 0 auto',
            width: 'clamp(200px, 30vw, 420px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'clamp(2px, 0.8vh, 10px)',
            minWidth: '180px',
            marginLeft: 'clamp(70px, 12vw, 160px)',
            zIndex: 10,
            position: 'relative',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          {/* character glow platform */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: 'clamp(30px, 8vh, 56px)',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'clamp(100px, 50%, 180px)',
              height: 'clamp(18px, 6vh, 36px)',
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(185,161,221,0.12) 0%, transparent 70%)',
              filter: 'blur(6px)',
              pointerEvents: 'none',
            }}
          />
          <Character mode={currentMode} expression={effectiveExpression} size={1} avatar={avatar} />
          <MusicPlayer {...music} />
        </div>

        {/* ---- RIGHT COLUMN: welcome + input + mode grid ---- */}
        <div
          style={{
            flex: 1,
            maxWidth: 'clamp(260px, 38vw, 440px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            gap: 'clamp(5px, 1.2vh, 14px)',
            minWidth: 0,
            width: '100%',
            maxHeight: '100%',
            minHeight: 0,
            overflow: 'hidden',
            marginRight: 'clamp(16px, 3.5vw, 56px)',
            zIndex: 10,
          }}
        >
          {!isHome && (
            <motion.button
              type="button"
              onClick={handleBackToHome}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              aria-label="Back to Home"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(46,41,56,0.5)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid var(--border-color)',
                borderRadius: '9999px',
                padding: 'clamp(6px, 1.5vh, 8px) clamp(12px, 2.5vw, 16px)',
                color: 'var(--text-secondary)',
                fontSize: 'clamp(12px, 2.8vw, 13px)',
                fontFamily: 'var(--font-body)',
                fontWeight: 500,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                alignSelf: 'flex-start',
                flexShrink: 0,
              }}
              whileHover={{ scale: 1.03, color: 'var(--text-primary)' }}
              whileTap={{ scale: 0.97 }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7.5 2.5L3.5 6L7.5 9.5" />
              </svg>
              Back to Home
            </motion.button>
          )}

          {isCalm ? (
            <CalmMode onExit={handleCalmExit} onExpressionChange={setCalmExpression} entryContext={modeEntryContext} onConsumeEntryContext={handleConsumeEntryContext} />
          ) : isCompanion ? (
            <CompanionMode onExit={handleCompanionExit} onExpressionChange={setCompanionExpression} entryContext={modeEntryContext} onConsumeEntryContext={handleConsumeEntryContext} />
          ) : isPlan ? (
            <PlanMode onExit={handlePlanExit} onExpressionChange={setPlanExpression} onStartFocus={handleStartFocus} entryContext={modeEntryContext} onConsumeEntryContext={handleConsumeEntryContext} />
          ) : isFocus ? (
            <FocusMode
              onExit={handleFocusExit}
              onExpressionChange={setFocusExpression}
              initialTask={focusTask}
              onConsumeInitialTask={handleConsumeFocusTask}
            />
          ) : (
            <>
{showWelcome && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
                  style={{ width: '100%' }}
                >
                  <h1
                    style={{
                      margin: 0,
                      fontSize: 'clamp(18px, 4.5vw, 30px)',
                      fontWeight: 700,
                      fontFamily: 'var(--font-display)',
                      color: 'var(--text-primary)',
                      lineHeight: 1.15,
                      letterSpacing: '-0.3px',
                    }}
                  >
                    Hi, I&apos;m <span style={{ color: AVATAR_HEADING_COLORS[avatar] }}>Sage</span>!
                  </h1>
                  <p
                    style={{
                      margin: 'clamp(3px, 1.2vh, 8px) 0 0',
                      fontSize: 'clamp(11px, 2.5vw, 14px)',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                    }}
                  >
                    Ready to make today a little brighter? 🌱
                  </p>
                </motion.div>
              )}
 
              <VoiceAssistant
                inputValue={inputValue}
                onInputChange={handleInputChange}
                onTextSubmit={handleHomeSubmit}
                voiceState={voiceUiState}
                sttSupported={voice.sttSupported}
                sttError={voice.sttError}
                chatError={chat.error}
                onMicToggle={handleMicToggle}
                messages={chat.messages}
                animateDelay={showWelcome}
                suggestion={suggest.suggestion ? {
                  modeLabel: suggest.modeLabel(suggest.suggestion.mode),
                  askLine: suggest.suggestion.askLine,
                } : null}
                onDeclineSuggestion={() => {
                  suggest.declineSuggestion();
                  scheduleInactivityReset();
                }}
                transcriptLimit={suggest.suggestion ? 2 : 8}
              />
 
              {/* ---- 2×2 mode grid (Home only) ---- */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: showWelcome ? 0.5 : 0.25 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 'clamp(6px, 1.5vw, 10px)',
                  width: '100%',
                }}
              >
                {MODE_BUTTONS.map((btn) => (
                  <ModeButton
                    key={btn.id}
                    {...btn}
                    isActive={btn.id === currentMode}
                    onClick={handleModeClick}
                  />
                ))}
              </motion.div>
            </>
          )}

          {!isConnected && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                margin: 0,
                fontSize: 'clamp(10px, 2.5vw, 12px)',
                color: 'var(--text-secondary)',
                opacity: 0.5,
              }}
            >
              Connecting to Sage...
            </motion.p>
          )}
        </div>
      </main>

      {/* connection dot */}
      <motion.div
        style={{
          position: 'fixed',
          bottom: 'calc(clamp(10px, 2.5vh, 16px) + var(--safe-bottom, 0px))',
          right: 'calc(clamp(10px, 3vw, 16px) + var(--safe-right, 0px))',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: isConnected ? 'var(--sage-sprout)' : 'var(--mode-companion)',
          boxShadow: `0 0 8px ${isConnected ? 'var(--sage-sprout)' : 'var(--mode-companion)'}`,
          zIndex: 20,
        }}
        animate={{
          scale: isConnected ? [1, 1.15, 1] : 1,
          opacity: isConnected ? [1, 0.5, 1] : 1,
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
};

MainScreen.displayName = 'MainScreen';
