import { motion } from 'motion/react';
import type { SageMode, SageExpression } from '../../types';
import { MODE_BUTTONS } from '../../types';
import { Character } from '../character';
import { CalmMode } from '../calm';
import { CompanionMode } from '../companion';
import { FocusMode } from '../focus';
import { PlanMode } from '../plan';
import { Header, InputField, ModeButton } from '../ui';
import { MusicPlayer } from '../music';
import { useMusicPlayer } from '../../hooks/useMusicPlayer';
import { useState, useCallback, useRef, useEffect } from 'react';

interface MainScreenProps {
  currentMode: SageMode;
  onModeChange: (mode: SageMode) => void;
  onSendMessage: (message: string) => void;
  isConnected: boolean;
}

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
  const overrideTimerRef = useRef<number | null>(null);

  const music = useMusicPlayer(currentMode);

  // Voice ducking: lower music volume when Sage speaks via speechSynthesis
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    let wasDucked = false;
    const check = () => {
      const speaking = window.speechSynthesis.speaking;
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
  }, [music]);

  const isCalm = currentMode === 'calm';
  const isCompanion = currentMode === 'companion';
  const isPlan = currentMode === 'plan';
  const isFocus = currentMode === 'focus';
  const isHome = !isCalm && !isCompanion && !isPlan && !isFocus;

  const handleBackToHome = useCallback(() => {
    setCalmExpression(null);
    setCompanionExpression(null);
    setPlanExpression(null);
    setFocusExpression(null);
    setFocusTask(null);
    onModeChange('idle');
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
  }, [flashExpression, isCalm, isCompanion, isPlan, isFocus]);

  const handleSubmit = useCallback((value: string) => {
    if (value.trim()) {
      onSendMessage(value.trim());
      setInputValue('');
      setShowWelcome(false);
    }
  }, [onSendMessage]);

  const handleModeClick = useCallback((mode: SageMode) => {
    if (mode !== currentMode) {
      setCalmExpression(null);
      setCompanionExpression(null);
      setPlanExpression(null);
      setFocusExpression(null);
      onModeChange(mode);
    }
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
    setPlanExpression(null);
    setFocusExpression(null);
    setFocusTask(task);
    onModeChange('focus');
  }, [onModeChange]);

  const handleConsumeFocusTask = useCallback(() => {
    setFocusTask(null);
  }, []);

  const effectiveExpression = expressionOverride ?? calmExpression ?? companionExpression ?? planExpression ?? focusExpression ?? undefined;

  return (
    <motion.div
      style={{
        position: 'relative',
        width: '100dvw',
        height: '100dvh',
        maxWidth: '100dvw',
        overflow: 'hidden',
        background: 'var(--bg-main)',
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
          background: 'linear-gradient(180deg, transparent 0%, var(--bg-secondary) 40%, var(--bg-main) 100%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <Header
        onSettingsClick={() => console.log('Settings clicked')}
        onCustomizeClick={() => console.log('Customize clicked')}
      />

      <main
        style={{
          position: 'relative',
          display: 'flex',
          height: '100%',
          padding: 'calc(clamp(40px, 10vh, 56px) + var(--safe-top, 0px)) clamp(16px, 4vw, 32px) calc(clamp(12px, 3vh, 24px) + var(--safe-bottom, 0px)) calc(clamp(16px, 4vw, 32px) + var(--safe-left, 0px))',
          boxSizing: 'border-box',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'clamp(12px, 3vw, 32px)',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* ---- LEFT COLUMN: character + music player ---- */}
        <div
          style={{
            flex: '0 0 auto',
            width: 'clamp(200px, 32vw, 340px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'clamp(6px, 1.5vh, 14px)',
            minWidth: '170px',
            marginLeft: 'clamp(24px, 5vw, 60px)',
            zIndex: 10,
            position: 'relative',
          }}
        >
          {/* character glow platform */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: 'clamp(50px, 12vh, 80px)',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'clamp(140px, 60%, 220px)',
              height: 'clamp(30px, 8vh, 50px)',
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(185,161,221,0.15) 0%, transparent 70%)',
              filter: 'blur(8px)',
              pointerEvents: 'none',
            }}
          />
          <Character mode={currentMode} expression={effectiveExpression} size={1} />
          <MusicPlayer {...music} />
        </div>

        {/* ---- RIGHT COLUMN: welcome + input + mode grid ---- */}
        <div
          style={{
            flex: 1,
            maxWidth: 'clamp(320px, 42vw, 480px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            gap: 'clamp(10px, 2.5vh, 20px)',
            minWidth: 0,
            width: '100%',
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
            <CalmMode onExit={handleCalmExit} onExpressionChange={setCalmExpression} />
          ) : isCompanion ? (
            <CompanionMode onExit={handleCompanionExit} onExpressionChange={setCompanionExpression} />
          ) : isPlan ? (
            <PlanMode onExit={handlePlanExit} onExpressionChange={setPlanExpression} onStartFocus={handleStartFocus} />
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
                      fontSize: 'clamp(22px, 5vw, 36px)',
                      fontWeight: 700,
                      fontFamily: 'var(--font-display)',
                      color: 'var(--text-primary)',
                      lineHeight: 1.15,
                      letterSpacing: '-0.3px',
                    }}
                  >
                    Hi, I&apos;m <span style={{ color: 'var(--accent-primary)' }}>Sage</span>!
                  </h1>
                  <p
                    style={{
                      margin: 'clamp(4px, 1.5vh, 10px) 0 0',
                      fontSize: 'clamp(13px, 3vw, 16px)',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                    }}
                  >
                    Ready to make today a little brighter? 🌱
                  </p>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: showWelcome ? 0.35 : 0.15 }}
                style={{ width: '100%' }}
              >
                <InputField
                  value={inputValue}
                  onChange={handleInputChange}
                  onSubmit={handleSubmit}
                  placeholder="Tell me what's on your mind..."
                  autoFocus={!showWelcome}
                />
              </motion.div>

              {/* ---- 2×2 mode grid (Home only) ---- */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: showWelcome ? 0.5 : 0.25 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 'clamp(8px, 2vw, 12px)',
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
