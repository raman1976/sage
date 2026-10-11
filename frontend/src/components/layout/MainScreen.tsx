import { motion } from 'motion/react';
import type { SageMode, SageExpression } from '../../types';
import { MODE_BUTTONS } from '../../types';
import { Character } from '../character';
import { CalmMode } from '../calm';
import { CompanionMode } from '../companion';
import { FocusMode } from '../focus';
import { PlanMode } from '../plan';
import { Header, InputField, ModeButton } from '../ui';
import { useState, useCallback, useRef, useEffect } from 'react';

interface MainScreenProps {
  currentMode: SageMode;
  onModeChange: (mode: SageMode) => void;
  onSendMessage: (message: string) => void;
  isConnected: boolean;
}

export const MainScreen = ({ 
  currentMode, 
  onModeChange, 
  onSendMessage, 
  isConnected 
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

  const isCalm = currentMode === 'calm';
  const isCompanion = currentMode === 'companion';
  const isPlan = currentMode === 'plan';
  const isFocus = currentMode === 'focus';

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
    // Stay excited for as long as the user is typing (outside Calm/Companion/
    // Plan/Focus, where Sage holds its own expressions instead).
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
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse 60% 50% at 15% 20%, rgba(185,161,221,0.08) 0%, transparent 60%),
          radial-gradient(ellipse 50% 40% at 85% 25%, rgba(185,161,221,0.06) 0%, transparent 55%),
          radial-gradient(ellipse 40% 30% at 50% 90%, rgba(185,161,221,0.04) 0%, transparent 50%)
        `,
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'clamp(80px, 22vh, 100px)',
        background: 'linear-gradient(180deg, transparent 0%, var(--bg-secondary) 40%, var(--bg-main) 100%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <Header 
        onSettingsClick={() => console.log('Settings clicked')}
        onCustomizeClick={() => console.log('Customize clicked')}
      />

      <main style={{
        position: 'relative',
        display: 'flex',
        height: '100%',
        padding: 'clamp(16px, 3vh, 24px) clamp(16px, 4vw, 32px) clamp(20px, 4vh, 32px)',
        boxSizing: 'border-box',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'clamp(12px, 3vw, 24px)',
      }}>
        <div style={{
          flex: '0 0 auto',
          width: 'clamp(200px, 35vw, 280px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '180px',
          zIndex: 10,
        }}>
          <Character mode={currentMode} expression={effectiveExpression} size={1} />
        </div>

        <div style={{
          flex: 1,
          maxWidth: '480px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: 'clamp(16px, 3vh, 22px)',
          minWidth: 0,
          width: '100%',
        }}>
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
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
              style={{ width: '100%' }}
            >
              <h1 style={{
                margin: 0,
                fontSize: 'clamp(24px, 5vw, 32px)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1.2,
                letterSpacing: '-0.3px',
              }}>
                Hi, I&apos;m Sage!
              </h1>
              <p style={{
                margin: 'clamp(8px, 2vh, 12px) 0 0',
                fontSize: 'clamp(14px, 3vw, 16px)',
                color: 'var(--text-secondary)',
                lineHeight: 1.4,
              }}>
                Ready to make today a little brighter? 🌱
              </p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: showWelcome ? 0.35 : 0.15 }}
            style={{ width: '100%' }}
          >
            <InputField
              value={inputValue}
              onChange={handleInputChange}
              onSubmit={handleSubmit}
              placeholder="Tell me what&apos;s on your mind..."
              autoFocus={!showWelcome}
            />
          </motion.div>
          </>
          )}

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: showWelcome ? 0.5 : 0.25 }}
            style={{ 
              display: 'flex', 
              gap: 'clamp(10px, 2.5vw, 14px)', 
              flexWrap: 'wrap',
              width: '100%',
              justifyContent: 'flex-start',
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

          {!isConnected && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                margin: 'clamp(8px, 1.5vh, 12px) 0 0',
                fontSize: 'clamp(11px, 2.5vw, 13px)',
                color: 'var(--text-secondary)',
                opacity: 0.6,
              }}
            >
              Connecting to Sage...
            </motion.p>
          )}
        </div>
      </main>

      <motion.div
        style={{
          position: 'fixed',
          bottom: 'clamp(12px, 3vh, 20px)',
          right: 'clamp(12px, 3vw, 20px)',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: isConnected ? 'var(--color-mint)' : 'var(--color-peach-ui)',
          boxShadow: `0 0 10px ${isConnected ? 'var(--color-mint)' : 'var(--color-peach-ui)'}`,
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