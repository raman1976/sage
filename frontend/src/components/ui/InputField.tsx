import { motion } from 'motion/react';
import { useRef, useState, useEffect, type ChangeEvent, type KeyboardEvent } from 'react';

interface InputFieldProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const InputField = ({ 
  placeholder = 'Tell me what\'s on your mind...', 
  value, 
  onChange, 
  onSubmit, 
  disabled = false,
  autoFocus = false 
}: InputFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(value);
    }
  };

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          background: isFocused 
            ? 'rgba(185,161,221,0.08)'
            : 'rgba(255,255,255,0.03)',
          borderRadius: 'clamp(20px, 5vw, 28px)',
          border: `1px solid ${isFocused ? 'var(--accent-primary)' : 'var(--border-color)'}`,
          boxShadow: isFocused 
            ? '0 8px 24px rgba(185,161,221,0.15), 0 4px 12px rgba(0,0,0,0.2)'
            : '0 4px 16px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.1)',
          zIndex: 0,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
        animate={{ 
          borderColor: isFocused ? 'var(--accent-primary)' : 'var(--border-color)',
          boxShadow: isFocused 
            ? '0 8px 24px rgba(185,161,221,0.15), 0 4px 12px rgba(0,0,0,0.2)'
            : '0 4px 16px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.1)',
          background: isFocused ? 'rgba(185,161,221,0.08)' : 'rgba(255,255,255,0.03)',
        }}
        transition={{ duration: 0.2 }}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          padding: 'clamp(14px, 3.5vh, 18px) clamp(24px, 5vw, 32px) clamp(14px, 3.5vh, 18px) clamp(50px, 12vw, 64px)',
          background: 'transparent',
          border: 'none',
          borderRadius: 'clamp(20px, 5vw, 28px)',
          fontSize: 'clamp(14px, 3.2vw, 16px)',
          fontFamily: 'system-ui, sans-serif',
          color: 'var(--text-primary)',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <div style={{
        position: 'absolute',
        left: 'clamp(14px, 3vw, 18px)',
        top: '50%',
        transform: 'translateY(-50%)',
        color: 'var(--text-secondary)',
        fontSize: 'clamp(16px, 3.5vw, 20px)',
        pointerEvents: 'none',
      }}>
        💭
      </div>
    </div>
  );
};

InputField.displayName = 'InputField';