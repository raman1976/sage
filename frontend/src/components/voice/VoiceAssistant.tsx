import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import type { SageChatMessage } from '../../hooks/useSageChat';
import { InputField } from '../ui';

export type VoiceUiState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface SuggestionCard {
  modeLabel: string;
  askLine: string;
}

interface VoiceAssistantProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onTextSubmit: (value: string) => void;
  voiceState: VoiceUiState;
  sttSupported: boolean;
  sttError: string | null;
  chatError: string | null;
  onMicToggle: () => void;
  messages: SageChatMessage[];
  animateDelay: boolean;
  suggestion?: SuggestionCard | null;
  onConfirmSuggestion?: () => void;
  onDeclineSuggestion?: () => void;
  transcriptLimit?: number;
}

const MicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" stroke="none" />
    <path d="M5 10a7 7 0 0 0 14 0" />
    <line x1="12" y1="17" x2="12" y2="22" />
  </svg>
);

const StopIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <rect x="6" y="6" width="12" height="12" rx="2.5" />
  </svg>
);

/** Animated sound waves shown while Sage speaks. */
const SoundWaves = () => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, height: 14 }} aria-hidden>
    {[0, 1, 2, 3].map((i) => (
      <motion.span
        key={i}
        style={{
          width: 3,
          height: 14,
          borderRadius: 2,
          background: 'var(--accent-primary)',
          transformOrigin: 'center',
        }}
        animate={{ scaleY: [0.35, 1, 0.35] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.12 }}
      />
    ))}
  </span>
);

export const VoiceAssistant = ({
  inputValue,
  onInputChange,
  onTextSubmit,
  voiceState,
  sttSupported,
  sttError,
  chatError,
  onMicToggle,
  messages,
  animateDelay,
  suggestion = null,
  onConfirmSuggestion,
  onDeclineSuggestion,
  transcriptLimit = 8,
}: VoiceAssistantProps) => {
  const listening = voiceState === 'listening';
  const thinking = voiceState === 'thinking';
  const speaking = voiceState === 'speaking';
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const statusText = sttError
    ?? (listening ? 'Listening… tap ■ to stop'
      : thinking ? 'Thinking…'
      : speaking ? 'Speaking — tap ■ to stop'
      : chatError ?? (sttSupported ? null : 'Voice input not supported here — typing works fully.'));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: animateDelay ? 0.35 : 0.15 }}
      style={{ width: '100%', minWidth: 0 }}
    >
      {/* input row: text field + send + mic */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0 }}>
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <InputField
            value={inputValue}
            onChange={onInputChange}
            onSubmit={onTextSubmit}
            placeholder="Tell me what's on your mind..."
          />
        </div>

        <motion.button
          type="button"
          onClick={() => onTextSubmit(inputValue)}
          disabled={!inputValue.trim()}
          aria-label="Send message"
          title="Send"
          style={{
            flex: '0 0 auto',
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '1px solid var(--border-color)',
            background: inputValue.trim() ? 'linear-gradient(135deg, var(--accent-primary), #9d85c7)' : 'rgba(255,255,255,0.05)',
            color: inputValue.trim() ? '#17171D' : 'var(--text-secondary)',
            cursor: inputValue.trim() ? 'pointer' : 'default',
            opacity: inputValue.trim() ? 1 : 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}
          whileTap={inputValue.trim() ? { scale: 0.92 } : undefined}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
          </svg>
        </motion.button>

        <motion.button
          type="button"
          onClick={onMicToggle}
          disabled={thinking}
          aria-label={listening ? 'Stop listening' : speaking ? 'Stop speaking' : 'Talk to Sage'}
          title={sttSupported ? 'Talk to Sage' : 'Voice input not supported — tap for details'}
          style={{
            flex: '0 0 auto',
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: listening ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
            background: listening || speaking
              ? 'linear-gradient(135deg, var(--accent-primary), #9d85c7)'
              : 'rgba(46,41,56,0.5)',
            color: listening || speaking ? '#17171D' : 'var(--accent-primary)',
            cursor: thinking ? 'wait' : 'pointer',
            opacity: thinking ? 0.55 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}
          animate={listening
            ? { boxShadow: ['0 0 0 0 rgba(185,161,221,0.55)', '0 0 0 12px rgba(185,161,221,0)', '0 0 0 0 rgba(185,161,221,0.55)'] }
            : speaking
              ? { boxShadow: ['0 0 10px rgba(185,161,221,0.5)', '0 0 20px rgba(185,161,221,0.8)', '0 0 10px rgba(185,161,221,0.5)'] }
              : { boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}
          transition={listening || speaking ? { duration: 1.6, repeat: Infinity, ease: 'easeOut' } : { duration: 0.2 }}
          whileTap={{ scale: 0.92 }}
        >
          {listening || speaking ? <StopIcon /> : <MicIcon />}
        </motion.button>
      </div>

      {/* status line */}
      <div
        role="status"
        aria-live="polite"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          minHeight: 18,
          marginTop: 4,
          fontSize: 'clamp(10px, 2.4vw, 12px)',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)',
        }}
      >
        {speaking && <SoundWaves />}
        {statusText && <span>{statusText}</span>}
      </div>

      {/* conversation transcript (internal scroll only) */}
      {messages.length > 0 && (
        <div
          ref={listRef}
          role="log"
          aria-live="polite"
          aria-label="Conversation with Sage"
          style={{
            marginTop: 4,
            maxHeight: 'clamp(84px, 17vh, 150px)',
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: '8px 10px',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-color)',
            boxSizing: 'border-box',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {messages.slice(-transcriptLimit).map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '90%',
                background: m.role === 'user' ? 'rgba(185,161,221,0.14)' : 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color)',
                borderRadius: 12,
                padding: '5px 9px',
                fontSize: 'clamp(11px, 2.5vw, 13px)',
                lineHeight: 1.4,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                overflowWrap: 'break-word',
              }}
            >
              {m.content}
            </div>
          ))}
        </div>
      )}

      {/* mode suggestion — always asks first, never auto-navigates */}
      {suggestion && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          role="group"
          aria-label={`Suggested mode: ${suggestion.modeLabel}`}
          style={{
            marginTop: 4,
            padding: '7px 10px',
            borderRadius: 14,
            background: 'rgba(185,161,221,0.10)',
            border: '1px solid var(--accent-primary)',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 'clamp(11px, 2.5vw, 13px)',
              lineHeight: 1.4,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {suggestion.askLine}
          </p>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onConfirmSuggestion}
              style={{
                border: '1px solid var(--accent-primary)',
                borderRadius: 9999,
                background: 'linear-gradient(135deg, var(--accent-primary), #9d85c7)',
                color: '#17171D',
                fontSize: 'clamp(11px, 2.4vw, 12px)',
                fontWeight: 700,
                padding: '5px 12px',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Yes, let&apos;s go
            </button>
            <button
              type="button"
              onClick={onDeclineSuggestion}
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: 9999,
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-secondary)',
                fontSize: 'clamp(11px, 2.4vw, 12px)',
                fontWeight: 600,
                padding: '5px 12px',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Not now
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

VoiceAssistant.displayName = 'VoiceAssistant';
