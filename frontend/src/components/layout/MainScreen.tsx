import { motion } from 'motion/react';
import type { SageMode } from '../../types';
import { MODE_BUTTONS } from '../../types';
import { Character } from '../character';
import { Header, InputField, ModeButton } from '../ui';
import { useState, useCallback } from 'react';

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

  const handleSubmit = useCallback((value: string) => {
    if (value.trim()) {
      onSendMessage(value.trim());
      setInputValue('');
      setShowWelcome(false);
    }
  }, [onSendMessage]);

  const handleModeClick = useCallback((mode: SageMode) => {
    if (mode !== currentMode) {
      onModeChange(mode);
    }
  }, [currentMode, onModeChange]);

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
          <Character mode={currentMode} size={1} />
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
              onChange={setInputValue}
              onSubmit={handleSubmit}
              placeholder="Tell me what&apos;s on your mind..."
              autoFocus={!showWelcome}
            />
          </motion.div>

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
                disabled={!isConnected}
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