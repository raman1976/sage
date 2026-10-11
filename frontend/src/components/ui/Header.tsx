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
  className = ''
}: IconButtonProps) => {
  const hoverStyle = { 
    scale: 1.1, 
    background: 'rgba(255,255,255,0.12)', 
    boxShadow: '0 8px 24px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.2)' 
  };
  const tapStyle = { scale: 0.95 };

  return (
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
        width: '44px',
        height: '44px',
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid var(--border-color)',
        borderRadius: '9999px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.15)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        fontSize: '20px',
        lineHeight: 1,
        color: 'var(--text-primary)',
        userSelect: 'none',
      }}
      whileHover={!disabled ? hoverStyle : undefined}
      whileTap={!disabled ? tapStyle : undefined}
    >
      {icon}
    </motion.button>
  );
};

IconButton.displayName = 'IconButton';

interface HeaderProps {
  onSettingsClick: () => void;
  onCustomizeClick: () => void;
}

export const Header = ({ onSettingsClick, onCustomizeClick }: HeaderProps) => (
  <header style={{
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 'clamp(12px, 3vh, 20px) clamp(16px, 4vw, 24px)',
    zIndex: 20,
    pointerEvents: 'none',
  }}>
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '10px',
      pointerEvents: 'auto',
    }}>
      <span style={{
        fontSize: 'clamp(18px, 4vw, 22px)',
        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
      }}>
        🌱
      </span>
      <span style={{
        fontSize: 'clamp(20px, 4.5vw, 26px)',
        fontWeight: 700,
        fontFamily: 'Georgia, serif',
        color: 'var(--text-primary)',
        letterSpacing: '-0.4px',
        textShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        Sage
      </span>
    </div>
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px',
      pointerEvents: 'auto',
    }}>
      <IconButton 
        icon="✨" 
        onClick={onCustomizeClick} 
        aria-label="Customize Sage" 
      />
      <IconButton 
        icon="⚙️" 
        onClick={onSettingsClick} 
        aria-label="Settings" 
      />
    </div>
  </header>
);

Header.displayName = 'Header';