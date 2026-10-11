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
  color, 
  gradient, 
  isActive = false, 
  onClick, 
  disabled = false 
}: ModeButtonProps) => {
  const hoverStyle = { scale: 1.02, y: -2, boxShadow: '0 16px 48px rgba(74, 55, 40, 0.18), 0 8px 16px rgba(74, 55, 40, 0.12)' };
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
        gap: '4px',
        width: '100%',
        minWidth: '100px',
        maxWidth: '130px',
        padding: '16px 24px',
        background: isActive ? gradient : `linear-gradient(135deg, ${color} 0%, ${color}DD 100%)`,
        border: 'none',
        borderRadius: '32px',
        boxShadow: isActive ? '0 16px 48px rgba(74, 55, 40, 0.18), 0 8px 16px rgba(74, 55, 40, 0.12)' : '0 8px 24px rgba(74, 55, 40, 0.12), 0 4px 8px rgba(74, 55, 40, 0.08)',
        color: '#4a3728',
        fontSize: '14px',
        fontWeight: 600,
        fontFamily: 'system-ui, sans-serif',
        letterSpacing: '0.2px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      whileHover={!disabled ? hoverStyle : undefined}
      whileTap={!disabled ? tapStyle : undefined}
      animate={{ scale: isActive ? 1.02 : 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <span style={{ fontSize: '24px', lineHeight: 1 }}>{icon}</span>
      <span style={{ textShadow: '0 1px 2px rgba(255,255,255,0.3)' }}>{label}</span>
      {isActive && (
        <motion.div
          style={{
            position: 'absolute',
            bottom: -2,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '24px',
            height: '4px',
            background: '#ffffff',
            borderRadius: '2px',
            boxShadow: '0 2px 8px rgba(255,255,255,0.5)',
          }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.button>
  );
};

ModeButton.displayName = 'ModeButton';