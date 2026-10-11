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
            ? 'linear-gradient(135deg, rgba(168,212,240,0.3) 0%, rgba(197,180,227,0.3) 100%)'
            : 'rgba(255,255,255,0.7)',
          borderRadius: '32px',
          border: `2px solid ${isFocused ? '#a7d0ff' : 'transparent'}`,
          boxShadow: isFocused ? '0 8px 24px rgba(74, 55, 40, 0.12), 0 4px 8px rgba(74, 55, 40, 0.08)' : '0 4px 12px rgba(74, 55, 40, 0.08), 0 2px 4px rgba(74, 55, 40, 0.05)',
          zIndex: 0,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
        animate={{ 
          borderColor: isFocused ? '#a7d0ff' : 'transparent',
          boxShadow: isFocused ? '0 8px 24px rgba(74, 55, 40, 0.12), 0 4px 8px rgba(74, 55, 40, 0.08)' : '0 4px 12px rgba(74, 55, 40, 0.08), 0 2px 4px rgba(74, 55, 40, 0.05)',
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
          padding: '16px 32px 16px 60px',
          background: 'transparent',
          border: 'none',
          borderRadius: '32px',
          fontSize: '16px',
          fontFamily: 'system-ui, sans-serif',
          color: '#4a3728',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <div style={{
        position: 'absolute',
        left: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#6b4f3a',
        fontSize: '18px',
        pointerEvents: 'none',
      }}>
        💭
      </div>
    </div>
  );
};

InputField.displayName = 'InputField';