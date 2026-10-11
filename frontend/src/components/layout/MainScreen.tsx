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
        width: '100vw',
        height: '100vh',
        minHeight: '100dvh',
        maxWidth: '100vw',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #ffdab9 0%, #ffb3a7 50%, #e8a8d8 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 20% 20%, rgba(255,218,185,0.4) 0%, transparent 50%),
          radial-gradient(ellipse 60% 40% at 80% 30%, rgba(232,168,216,0.3) 0%, transparent 50%),
          radial-gradient(ellipse 50% 30% at 50% 80%, rgba(168,216,163,0.2) 0%, transparent 50%)
        `,
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '120px',
        background: 'linear-gradient(180deg, #d4a574 0%, #c49564 100%)',
        borderTopLeftRadius: '40px',
        borderTopRightRadius: '40px',
        boxShadow: 'inset 0 20px 40px rgba(0,0,0,0.1)',
        zIndex: 0,
      }}>
        <div style={{
          position: 'absolute',
          bottom: '120px',
          left: '10%',
          width: '60px',
          height: '80px',
          background: 'linear-gradient(180deg, #4a7c2e 0%, #3a5f22 100%)',
          borderRadius: '30px 30px 10px 10px',
          transform: 'rotate(-3deg)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '120px',
          left: '15%',
          width: '40px',
          height: '60px',
          background: 'linear-gradient(180deg, #5a8c3e 0%, #4a7c2e 100%)',
          borderRadius: '20px 20px 8px 8px',
          transform: 'rotate(5deg)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '120px',
          right: '12%',
          width: '50px',
          height: '70px',
          background: 'linear-gradient(180deg, #8b4513 0%, #6b3510 100%)',
          borderRadius: '50% 50% 20% 20%',
        }}>
          <div style={{
            position: 'absolute',
            top: '-30px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '55px',
            height: '40px',
            background: 'radial-gradient(ellipse at center, #e8a8d8 0%, #d48ab8 100%)',
            borderRadius: '50%',
          }} />
        </div>
      </div>

      <Header 
        onSettingsClick={() => console.log('Settings clicked')}
        onCustomizeClick={() => console.log('Customize clicked')}
      />

      <main style={{
        position: 'relative',
        display: 'flex',
        height: '100%',
        padding: '48px 32px 48px',
        boxSizing: 'border-box',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          flex: '0 0 320px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '280px',
          zIndex: 10,
        }}>
          <Character mode={currentMode} size={1} />
        </div>

        <div style={{
          flex: 1,
          maxWidth: '500px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingLeft: '32px',
          gap: '24px',
          minWidth: 0,
        }}>
          {showWelcome && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
              style={{ width: '100%' }}
            >
              <h1 style={{
                margin: 0,
                fontSize: '36px',
                fontWeight: 700,
                color: '#4a3728',
                lineHeight: 1.2,
                letterSpacing: '-0.5px',
              }}>
                Hi, I&apos;m Sage!
              </h1>
              <p style={{
                margin: '16px 0 0',
                fontSize: '18px',
                color: '#6b4f3a',
                lineHeight: 1.5,
              }}>
                Ready to make today a little brighter? 🌱
              </p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: showWelcome ? 0.5 : 0.2 }}
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: showWelcome ? 0.7 : 0.3 }}
            style={{ 
              display: 'flex', 
              gap: '16px', 
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
                margin: '16px 0 0',
                fontSize: '13px',
                color: '#6b4f3a',
                opacity: 0.7,
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
          bottom: '24px',
          right: '24px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: isConnected ? '#a8e6cf' : '#ffb3a7',
          boxShadow: `0 0 8px ${isConnected ? '#a8e6cf' : '#ffb3a7'}`,
          zIndex: 20,
        }}
        animate={{
          scale: isConnected ? [1, 1.2, 1] : 1,
          opacity: isConnected ? [1, 0.6, 1] : 1,
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
};

MainScreen.displayName = 'MainScreen';