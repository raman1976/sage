import { motion, AnimatePresence } from 'motion/react';
import type { useVoice } from '../../hooks/useVoice';

type VoiceEngine = ReturnType<typeof useVoice>;

interface VoiceSettingsProps {
  open: boolean;
  onClose: () => void;
  voice: VoiceEngine;
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  width: '100%',
};

const labelStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
  fontWeight: 600,
};

const hintStyle: React.CSSProperties = {
  margin: '2px 0 0',
  fontSize: 11,
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-body)',
  lineHeight: 1.4,
};

const toggleStyle = (on: boolean): React.CSSProperties => ({
  flex: '0 0 auto',
  width: 40,
  height: 22,
  borderRadius: 9999,
  border: '1px solid var(--border-color)',
  background: on ? 'linear-gradient(135deg, var(--accent-primary), #9d85c7)' : 'rgba(255,255,255,0.08)',
  cursor: 'pointer',
  position: 'relative',
  padding: 0,
});

const knobStyle = (on: boolean): React.CSSProperties => ({
  position: 'absolute',
  top: 2,
  left: on ? 20 : 2,
  width: 16,
  height: 16,
  borderRadius: '50%',
  background: '#fff',
  transition: 'left 0.18s ease',
});

export const VoiceSettings = ({ open, onClose, voice }: VoiceSettingsProps) => {
  const hasMaleEnUS = voice.voices.some(
    (v) => v.lang.toLowerCase().startsWith('en-us') && /male|david|daniel|alex|fred|aaron|nathan|ryan|justin|christopher/i.test(v.name),
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <div
            onClick={onClose}
            aria-hidden
            style={{ position: 'fixed', inset: 0, zIndex: 28, background: 'transparent' }}
          />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            role="dialog"
            aria-label="Voice settings"
            style={{
              position: 'fixed',
              top: 'calc(52px + var(--safe-top, 0px))',
              right: 'calc(10px + var(--safe-right, 0px))',
              width: 'min(300px, calc(100dvw - 20px))',
              maxHeight: 'min(70dvh, 420px)',
              overflowY: 'auto',
              zIndex: 29,
              background: 'rgba(38, 33, 48, 0.92)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid var(--border-color)',
              borderRadius: 16,
              padding: '12px 14px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={rowStyle}>
              <p style={{ ...labelStyle, fontSize: 14 }}>🔊 Voice settings</p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close voice settings"
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 15, padding: 4 }}
              >
                ✕
              </button>
            </div>

            {!voice.ttsSupported && (
              <p style={hintStyle}>This browser can&apos;t speak out loud — text replies still work fully.</p>
            )}

            <div style={rowStyle}>
              <div>
                <p style={labelStyle}>Sage voice</p>
                <p style={hintStyle}>Hear replies spoken aloud</p>
              </div>
              <button type="button" role="switch" aria-checked={voice.voiceOn} aria-label="Sage voice on or off" onClick={() => voice.setVoiceOn(!voice.voiceOn)} style={toggleStyle(voice.voiceOn)}>
                <span style={knobStyle(voice.voiceOn)} />
              </button>
            </div>

            <div style={rowStyle}>
              <div>
                <p style={labelStyle}>Auto-speak replies</p>
                <p style={hintStyle}>Speak every reply automatically</p>
              </div>
              <button type="button" role="switch" aria-checked={voice.autoSpeak} aria-label="Auto-speak replies" onClick={() => voice.setAutoSpeak(!voice.autoSpeak)} style={toggleStyle(voice.autoSpeak)}>
                <span style={knobStyle(voice.autoSpeak)} />
              </button>
            </div>

            <div style={{ width: '100%' }}>
              <p style={labelStyle}>Voice</p>
              {voice.voices.length > 0 ? (
                <select
                  value={voice.voiceURI ?? ''}
                  onChange={(e) => voice.setVoiceURI(e.target.value || null)}
                  aria-label="Choose Sage's voice"
                  style={{
                    width: '100%',
                    marginTop: 4,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 10,
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    padding: '7px 9px',
                    fontFamily: 'var(--font-body)',
                    boxSizing: 'border-box',
                  }}
                >
                  {voice.voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              ) : (
                <p style={hintStyle}>Loading voices…</p>
              )}
              <p style={hintStyle}>
                {voice.voices.length > 0 && !hasMaleEnUS
                  ? 'No male en-US voice on this device — using the best available voice.'
                  : 'Prefers a natural American male voice when one is available.'}
              </p>
            </div>

            <div style={{ width: '100%' }}>
              <div style={rowStyle}>
                <p style={labelStyle}>Speed</p>
                <p style={{ ...hintStyle, margin: 0 }}>{voice.rate.toFixed(2)}×</p>
              </div>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.05}
                value={voice.rate}
                onChange={(e) => voice.setRate(parseFloat(e.target.value))}
                aria-label="Speaking speed"
                style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
              />
              <p style={hintStyle}>Natural is around 1.00–1.08×.</p>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => voice.previewVoice()}
                disabled={!voice.ttsSupported}
                style={{
                  flex: '1 1 auto',
                  border: '1px solid var(--accent-primary)',
                  borderRadius: 9999,
                  background: 'linear-gradient(135deg, var(--accent-primary), #9d85c7)',
                  color: '#17171D',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '7px 12px',
                  cursor: voice.ttsSupported ? 'pointer' : 'default',
                  opacity: voice.ttsSupported ? 1 : 0.5,
                  fontFamily: 'var(--font-body)',
                }}
              >
                ▶ Preview
              </button>
              <button
                type="button"
                onClick={voice.stopSpeaking}
                style={{
                  flex: '1 1 auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: 9999,
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '7px 12px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                ⏹ Stop
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

VoiceSettings.displayName = 'VoiceSettings';
