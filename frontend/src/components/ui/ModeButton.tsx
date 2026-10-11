import { motion } from 'motion/react';
import type { ModeButtonConfig } from '../../types';

interface ModeButtonProps extends ModeButtonConfig {
  isActive?: boolean;
  onClick: (mode: ModeButtonConfig['id']) => void;
  disabled?: boolean;
}

export const ModeButton = ({ 
  id, 
  label, 
  icon, 
  color: _color, 
  gradient: _gradient, 
  isActive = false, 
  onClick, 
  disabled = false 
}: ModeButtonProps) => {
  const activeGradient = 'linear-gradient(135deg, var(--accent-primary) 0%, #9d85c7 100%)';
  const inactiveGradient = 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%)';
  
  const hoverStyle = { 
    scale: 1.02, 
    y: -2, 
    boxShadow: '0 12px 32px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)' 
  };
  const tapStyle = { scale: 0.98, y: 0 };

  return (
    <motion.button
      type="button"
      onClick={() => !disabled && onClick(id)}
      disabled={disabled}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        width: '100%',
        minWidth: 'clamp(90px, 22vw, 120px)',
        maxWidth: '140px',
        padding: 'clamp(12px, 3vh, 16px) clamp(16px, 4vw, 24px)',
        background: isActive ? activeGradient : inactiveGradient,
        border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
        borderRadius: 'clamp(20px, 5vw, 28px)',
        boxShadow: isActive 
          ? '0 8px 24px rgba(185,161,221,0.25), 0 4px 12px rgba(0,0,0,0.2)'
          : '0 6px 18px rgba(0,0,0,0.25), 0 3px 8px rgba(0,0,0,0.15)',
        color: 'var(--text-primary)',
        fontSize: 'clamp(12px, 2.8vw, 14px)',
        fontWeight: 600,
        fontFamily: 'system-ui, sans-serif',
        letterSpacing: '0.15px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      whileHover={!disabled ? hoverStyle : undefined}
      whileTap={!disabled ? tapStyle : undefined}
      animate={{ scale: isActive ? 1.015 : 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <span style={{ fontSize: 'clamp(18px, 4.5vw, 22px)', lineHeight: 1 }}>{icon}</span>
      <span style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{label}</span>
      {isActive && (
        <motion.div
          style={{
            position: 'absolute',
            bottom: -1,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'clamp(18px, 4vw, 24px)',
            height: '3px',
            background: 'var(--text-primary)',
            borderRadius: '2px',
            boxShadow: '0 1px 6px rgba(185,161,221,0.5)',
          }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.button>
  );
};

ModeButton.displayName = 'ModeButton';