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
  const hoverStyle = { scale: 1.1, background: 'rgba(255,255,255,0.95)', boxShadow: '0 8px 24px rgba(74, 55, 40, 0.12), 0 4px 8px rgba(74, 55, 40, 0.08)' };
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
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: 'none',
        borderRadius: '9999px',
        boxShadow: '0 4px 12px rgba(74, 55, 40, 0.08), 0 2px 4px rgba(74, 55, 40, 0.05)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontSize: '20px',
        lineHeight: 1,
        color: '#4a3728',
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
    padding: '24px 32px',
    zIndex: 20,
    pointerEvents: 'none',
  }}>
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px',
      pointerEvents: 'auto',
    }}>
      <span style={{
        fontSize: '20px',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
      }}>
        🌱
      </span>
      <span style={{
        fontSize: '24px',
        fontWeight: 700,
        fontFamily: 'Georgia, serif',
        color: '#4a3728',
        textShadow: '0 2px 4px rgba(255,255,255,0.3)',
        letterSpacing: '-0.5px',
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