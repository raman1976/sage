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
  subtitle,
  icon,
  color,
  gradient,
  glowColor,
  isActive = false,
  onClick,
  disabled = false,
}: ModeButtonProps) => {
  return (
    <motion.button
      type="button"
      onClick={() => !disabled && onClick(id)}
      disabled={disabled}
      aria-label={`${label} — ${subtitle}`}
      aria-pressed={isActive}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(8px, 2vw, 12px)',
        width: '100%',
        padding: 'clamp(10px, 2.5vh, 14px) clamp(12px, 2.5vw, 16px)',
        background: isActive ? gradient : 'rgba(46,41,56,0.5)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${isActive ? `${color}44` : 'var(--border-color)'}`,
        borderRadius: 'clamp(14px, 3vw, 18px)',
        boxShadow: isActive
          ? `0 4px 20px ${glowColor}, 0 0 0 1px ${color}30 inset`
          : '0 2px 10px rgba(0,0,0,0.2)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-body)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        textAlign: 'left',
        overflow: 'hidden',
        minHeight: 'clamp(48px, 12vh, 64px)',
        boxSizing: 'border-box',
      }}
      whileHover={!disabled ? { scale: 1.02, y: -1 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* decorative botanical accent */}
      <div
        style={{
          position: 'absolute',
          right: -8,
          bottom: -8,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          opacity: isActive ? 0.6 : 0.25,
          pointerEvents: 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* icon */}
      <span
        style={{
          fontSize: 'clamp(20px, 4vw, 26px)',
          lineHeight: 1,
          flexShrink: 0,
          filter: `drop-shadow(0 0 6px ${glowColor})`,
        }}
      >
        {icon}
      </span>

      {/* label + subtitle */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span
          style={{
            fontSize: 'clamp(13px, 3vw, 15px)',
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: '0.2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 'clamp(10px, 2.2vw, 12px)',
            fontWeight: 400,
            color: 'var(--text-secondary)',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {subtitle}
        </span>
      </div>

      {/* circular arrow */}
      <div
        style={{
          width: 'clamp(24px, 5vw, 28px)',
          height: 'clamp(24px, 5vw, 28px)',
          borderRadius: '50%',
          border: '1px solid var(--border-color)',
          background: 'rgba(255,255,255,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          opacity: 0.6,
          transition: 'opacity 0.2s ease',
        }}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="var(--text-secondary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3.5 1.5L7 5L3.5 8.5" />
        </svg>
      </div>

      {/* active glow ring */}
      {isActive && (
        <motion.div
          style={{
            position: 'absolute',
            inset: -1,
            borderRadius: 'clamp(14px, 3vw, 18px)',
            border: `1px solid ${color}`,
            opacity: 0.4,
            pointerEvents: 'none',
          }}
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.button>
  );
};

ModeButton.displayName = 'ModeButton';
