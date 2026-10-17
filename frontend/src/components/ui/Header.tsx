import { motion } from 'motion/react';

interface IconButtonProps {
  icon: string;
  onClick: () => void;
  'aria-label': string;
  disabled?: boolean;
  className?: string;
}

export const IconButton = ({
  icon,
  onClick,
  'aria-label': ariaLabel,
  disabled = false,
  className = '',
}: IconButtonProps) => (
  <motion.button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    className={className}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 'clamp(36px, 8vw, 44px)',
      height: 'clamp(36px, 8vw, 44px)',
      background: 'rgba(255,255,255,0.05)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid var(--border-color)',
      borderRadius: '50%',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      fontSize: 'clamp(14px, 3vw, 18px)',
      lineHeight: 1,
      color: 'var(--text-primary)',
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent',
    }}
    whileHover={!disabled ? { scale: 1.08, background: 'rgba(255,255,255,0.1)' } : undefined}
    whileTap={!disabled ? { scale: 0.95 } : undefined}
  >
    {icon}
  </motion.button>
);

IconButton.displayName = 'IconButton';

interface HeaderProps {
  onSettingsClick: () => void;
  onCustomizeClick: () => void;
  onLogoClick?: () => void;
  /** Color for the "Sage" wordmark, matched to the selected avatar. */
  logoColor?: string;
}

export const Header = ({ onSettingsClick, onCustomizeClick, onLogoClick, logoColor }: HeaderProps) => (
  <header
    style={{
      position: 'absolute',
      top: 'var(--safe-top, 0px)',
      left: 'var(--safe-left, 0px)',
      right: 'var(--safe-right, 0px)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 'clamp(8px, 2vh, 16px) clamp(16px, 4vw, 28px)',
      zIndex: 20,
      pointerEvents: 'none',
    }}
  >
    <motion.button
      type="button"
      onClick={onLogoClick}
      aria-label="Go to Home"
      title="Go to Home"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        pointerEvents: 'auto',
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
    >
      <span
        style={{
          fontSize: 'clamp(16px, 3.5vw, 22px)',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        }}
      >
        🌱
      </span>
      <span
        style={{
          fontSize: 'clamp(18px, 4vw, 26px)',
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          color: logoColor ?? 'var(--text-primary)',
          letterSpacing: '-0.3px',
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        Sage
      </span>
    </motion.button>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(6px, 1.5vw, 10px)',
        pointerEvents: 'auto',
      }}
    >
      <IconButton icon="✨" onClick={onCustomizeClick} aria-label="Change Sage avatar" />
      <IconButton icon="⚙️" onClick={onSettingsClick} aria-label="Settings" />
    </div>
  </header>
);

Header.displayName = 'Header';
