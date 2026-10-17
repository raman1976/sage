import { motion } from 'motion/react';
import type { CSSProperties } from 'react';
import type { ModeButtonConfig } from '../../types';

interface ModeButtonProps extends ModeButtonConfig {
  isActive?: boolean;
  onClick: (mode: ModeButtonConfig['id']) => void;
  disabled?: boolean;
}

type DecoSide = 'focus' | 'companion' | 'calm' | 'plan';

/** Four-point sparkle star path centred on (cx, cy). */
const sparklePath = (cx: number, cy: number, r: number) => {
  const s = r * 0.3;
  return [
    `M${cx} ${cy - r}`,
    `L${cx + s} ${cy - s}`,
    `L${cx + r} ${cy}`,
    `L${cx + s} ${cy + s}`,
    `L${cx} ${cy + r}`,
    `L${cx - s} ${cy + s}`,
    `L${cx - r} ${cy}`,
    `L${cx - s} ${cy - s}`,
    'Z',
  ].join(' ');
};

/** Soft heart path centred on (cx, cy) with half-size s. */
const heartPath = (cx: number, cy: number, s: number) =>
  [
    `M${cx} ${cy + s * 0.8}`,
    `C ${cx - s * 1.1} ${cy - s * 0.15} ${cx - s * 0.6} ${cy - s * 1.05} ${cx} ${cy - s * 0.35}`,
    `C ${cx + s * 0.6} ${cy - s * 1.05} ${cx + s * 1.1} ${cy - s * 0.15} ${cx} ${cy + s * 0.8}`,
    'Z',
  ].join(' ');

/** Per-mode decorative artwork drawn with SVG (leaves / hearts / clouds / mountains). */
function ModeDecoration({ side, active }: { side: DecoSide; active: boolean }) {
  const base: CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    opacity: active ? 1 : 0.72,
    transition: 'opacity 0.4s ease',
  };

  if (side === 'focus') {
    return (
      <svg viewBox="0 0 220 90" preserveAspectRatio="none" style={base} aria-hidden="true">
        <defs>
          <linearGradient id="mode-focus-leaf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#9dffd0" stopOpacity="0.85" />
            <stop offset="1" stopColor="#2f8f66" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <g fill="url(#mode-focus-leaf)">
          <path d="M148 90 C 152 68, 170 54, 196 50 C 194 72, 176 86, 148 90 Z" />
          <path d="M162 90 C 166 73, 182 62, 205 60 C 202 78, 186 89, 162 90 Z" />
          <path d="M138 90 C 141 76, 152 66, 170 63 C 166 80, 154 89, 138 90 Z" />
        </g>
        <g fill="#c9ffe6">
          <circle cx="46" cy="20" r="1.5" opacity="0.75" />
          <circle cx="78" cy="30" r="1" opacity="0.5" />
          <circle cx="196" cy="18" r="1.1" opacity="0.6" />
          <circle cx="60" cy="70" r="1" opacity="0.4" />
        </g>
      </svg>
    );
  }

  if (side === 'companion') {
    return (
      <svg viewBox="0 0 220 90" preserveAspectRatio="none" style={base} aria-hidden="true">
        <defs>
          <radialGradient id="mode-companion-glow" cx="18%" cy="92%" r="82%">
            <stop offset="0" stopColor="#ff7ebd" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ff7ebd" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="220" height="90" fill="url(#mode-companion-glow)" />
        <path
          d="M0 80 Q 28 68 56 76 T 112 74 T 168 78 T 220 72 L 220 90 L 0 90 Z"
          fill="#b957c9"
          opacity="0.45"
        />
        <path
          d="M0 87 Q 38 79 76 85 T 152 83 T 220 81 L 220 90 L 0 90 Z"
          fill="#7a37a0"
          opacity="0.5"
        />
        <g fill="#ffb3dd">
          <path d={heartPath(30, 22, 6)} opacity="0.9" />
          <path d={heartPath(196, 34, 5)} opacity="0.7" />
          <path d={heartPath(120, 16, 4)} opacity="0.55" />
        </g>
        <g fill="#ffd6ec">
          <circle cx="62" cy="42" r="1.2" opacity="0.6" />
          <circle cx="172" cy="16" r="1.4" opacity="0.7" />
        </g>
      </svg>
    );
  }

  if (side === 'calm') {
    return (
      <svg viewBox="0 0 220 90" preserveAspectRatio="none" style={base} aria-hidden="true">
        <defs>
          <linearGradient id="mode-calm-cloud" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e7b6ff" stopOpacity="0.5" />
            <stop offset="1" stopColor="#8a4fb8" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path
          d="M0 78 Q 22 66 44 74 Q 60 62 82 72 Q 100 64 120 74 Q 142 64 164 74 Q 188 64 220 76 L 220 90 L 0 90 Z"
          fill="url(#mode-calm-cloud)"
        />
        <path
          d="M0 86 Q 30 78 60 84 Q 92 78 124 84 Q 158 78 190 84 Q 206 80 220 84 L 220 90 L 0 90 Z"
          fill="#6d3f9c"
          opacity="0.5"
        />
        <g fill="#ffe6a8">
          <path d={sparklePath(34, 20, 3)} opacity="0.9" />
          <path d={sparklePath(186, 28, 2.4)} opacity="0.7" />
          <path d={sparklePath(120, 14, 2)} opacity="0.6" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 220 90" preserveAspectRatio="none" style={base} aria-hidden="true">
      <defs>
        <linearGradient id="mode-plan-mtn1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c98a3f" stopOpacity="0.55" />
          <stop offset="1" stopColor="#5a3a1c" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="mode-plan-mtn2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a5c28" stopOpacity="0.6" />
          <stop offset="1" stopColor="#3a2410" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <path d="M0 90 L 40 58 L 78 90 Z" fill="url(#mode-plan-mtn1)" />
      <path d="M60 90 L 110 50 L 158 90 Z" fill="url(#mode-plan-mtn2)" />
      <path d="M140 90 L 182 62 L 220 90 Z" fill="url(#mode-plan-mtn1)" />
      <g fill="#ffe1a0">
        <path d={sparklePath(40, 24, 4)} opacity="0.95" />
        <path d={sparklePath(150, 20, 3)} opacity="0.85" />
        <path d={sparklePath(196, 40, 2.2)} opacity="0.7" />
        <path d={sparklePath(90, 14, 2)} opacity="0.6" />
      </g>
      <circle cx="120" cy="34" r="1" fill="#ffe9bf" opacity="0.6" />
    </svg>
  );
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
        padding: 'clamp(10px, 2.4vh, 14px) clamp(12px, 2.5vw, 16px)',
        background: `radial-gradient(130% 110% at 16% 16%, ${color}26 0%, transparent 58%), ${gradient}`,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: isActive ? `1px solid ${color}` : `1px solid ${color}55`,
        borderRadius: 'clamp(16px, 3vw, 20px)',
        boxShadow: isActive
          ? `0 10px 34px -12px ${glowColor}, 0 0 70px -34px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.18)`
          : '0 6px 20px -12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-body)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        textAlign: 'left',
        overflow: 'hidden',
        minHeight: 'clamp(52px, 12vh, 68px)',
        boxSizing: 'border-box',
      }}
      whileHover={!disabled ? { scale: 1.015, y: -1 } : undefined}
      whileTap={!disabled ? { scale: 0.985 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
    >
      {/* per-mode botanical / dreamy artwork */}
      <ModeDecoration side={id as DecoSide} active={isActive} />

      {/* bottom ambient glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '8%',
          right: '8%',
          bottom: '-8px',
          height: '14px',
          borderRadius: '50%',
          background: `radial-gradient(ellipse, ${glowColor} 0%, transparent 70%)`,
          opacity: isActive ? 0.85 : 0.45,
          pointerEvents: 'none',
          filter: 'blur(5px)',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* icon with glow */}
      <span
        style={{
          fontSize: 'clamp(20px, 4vw, 26px)',
          lineHeight: 1,
          flexShrink: 0,
          filter: isActive
            ? `drop-shadow(0 0 10px ${glowColor}) drop-shadow(0 0 4px ${glowColor})`
            : `drop-shadow(0 0 7px ${glowColor})`,
          position: 'relative',
          zIndex: 2,
        }}
      >
        {icon}
      </span>

      {/* label + subtitle */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          position: 'relative',
          zIndex: 2,
        }}
      >
        <span
          style={{
            fontSize: 'clamp(13px, 3vw, 15px)',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '0.3px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: 'var(--text-primary)',
            textShadow: `0 1px 6px rgba(0,0,0,0.45)${isActive ? `, 0 0 10px ${glowColor}55` : ''}`,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 'clamp(10px, 2.2vw, 12px)',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.72)',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}
        >
          {subtitle}
        </span>
      </div>

      {/* circular translucent arrow button */}
      <div
        style={{
          width: 'clamp(26px, 5.5vw, 30px)',
          height: 'clamp(26px, 5.5vw, 30px)',
          borderRadius: '50%',
          border: `1px solid ${isActive ? `${color}99` : 'rgba(255,255,255,0.22)'}`,
          background: isActive ? `${glowColor}` : 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          position: 'relative',
          zIndex: 2,
          opacity: isActive ? 0.95 : 0.75,
          transition: 'opacity 0.2s ease, border 0.2s ease, background 0.2s ease',
          boxShadow: isActive ? `0 0 12px ${glowColor}` : 'none',
        }}
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 10 10"
          fill="none"
          stroke={isActive ? '#ffffff' : 'rgba(255,255,255,0.85)'}
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3.5 1.5L7 5L3.5 8.5" />
        </svg>
      </div>

      {/* active neon glow ring */}
      {isActive && (
        <motion.div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: -1,
            borderRadius: 'clamp(16px, 3vw, 20px)',
            border: `1px solid ${color}`,
            opacity: 0.5,
            pointerEvents: 'none',
            filter: 'blur(1px)',
          }}
          animate={{ opacity: [0.3, 0.65, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.button>
  );
};

ModeButton.displayName = 'ModeButton';
