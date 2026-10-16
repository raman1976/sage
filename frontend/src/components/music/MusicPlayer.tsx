import { useCallback, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { formatTime, type MusicPlayerState, type MusicPlayerActions } from '../../hooks/useMusicPlayer';

type PlayerProps = MusicPlayerState & MusicPlayerActions;

/* --------------------------- inline SVG icons ---------------------------- */

const IconPlay = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5.14v13.72c0 .77.83 1.25 1.51.86l11-6.86a1.02 1.02 0 0 0 0-1.72l-11-6.86A1.02 1.02 0 0 0 8 5.14z" />
  </svg>
);

const IconPause = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);

const IconVolume = ({ muted, size = 16 }: { muted: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
    {muted ? (
      <>
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </>
    ) : (
      <>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </>
    )}
  </svg>
);

/* --------------------------- album art (CSS) ----------------------------- */

const AlbumArt = ({ mode }: { mode: string }) => {
  const gradients: Record<string, string> = {
    idle: 'linear-gradient(135deg, #2a1f3d 0%, #4a3570 40%, #8b6cc1 100%)',
    calm: 'linear-gradient(135deg, #1a1530 0%, #2d2250 35%, #6b52a8 75%, #a88bdd 100%)',
    focus: 'linear-gradient(135deg, #0f2920 0%, #1a4030 40%, #3d8b6e 100%)',
    companion: 'linear-gradient(135deg, #2d1a28 0%, #5a2d4a 40%, #c1789e 100%)',
    plan: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d50 40%, #7080c1 100%)',
  };
  return (
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: 14,
        background: gradients[mode] ?? gradients.idle,
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* moon */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 12,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#e8dff8',
          boxShadow: '0 0 12px rgba(232,223,248,0.6), 0 0 24px rgba(232,223,248,0.3)',
        }}
      />
      {/* moon shadow crescent */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 10,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: gradients[mode] ?? gradients.idle,
          transform: 'translate(6px, -3px)',
        }}
      />
      {/* cloud bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 44,
          height: 16,
          borderRadius: '16px 16px 8px 8px',
          background: 'rgba(185,161,221,0.35)',
          filter: 'blur(1px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 5,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 52,
          height: 14,
          borderRadius: '14px 14px 6px 6px',
          background: 'rgba(185,161,221,0.18)',
          filter: 'blur(2px)',
        }}
      />
      {/* sparkles */}
      <div style={{ position: 'absolute', top: 8, left: 10, width: 3, height: 3, borderRadius: '50%', background: '#e8dff8', opacity: 0.8 }} />
      <div style={{ position: 'absolute', top: 18, left: 6, width: 2, height: 2, borderRadius: '50%', background: '#e8dff8', opacity: 0.5 }} />
      <div style={{ position: 'absolute', top: 5, left: 22, width: 2, height: 2, borderRadius: '50%', background: '#ffd166', opacity: 0.7 }} />
    </div>
  );
};

/* ------------------------- progress bar (seekable) ------------------------ */

function ProgressBar({
  current,
  duration,
  onSeek,
  disabled,
}: {
  current: number;
  duration: number;
  onSeek: (fraction: number) => void;
  disabled: boolean;
}) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const fraction = duration > 0 ? current / duration : 0;

  const getFraction = useCallback((clientX: number) => {
    const el = barRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    onSeek(getFraction(e.clientX));
  }, [disabled, getFraction, onSeek]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    onSeek(getFraction(e.clientX));
  }, [dragging, getFraction, onSeek]);

  const onPointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  return (
    <div
      ref={barRef}
      role="slider"
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fraction * 100)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'ArrowRight') onSeek(Math.min(1, fraction + 0.05));
        if (e.key === 'ArrowLeft') onSeek(Math.max(0, fraction - 0.05));
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'relative',
        width: '100%',
        height: 18,
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        touchAction: 'none',
      }}
    >
      {/* track */}
      <div
        style={{
          width: '100%',
          height: 4,
          borderRadius: 2,
          background: 'rgba(185,161,221,0.15)',
          overflow: 'hidden',
        }}
      >
        {/* fill */}
        <div
          style={{
            width: `${fraction * 100}%`,
            height: '100%',
            borderRadius: 2,
            background: 'linear-gradient(90deg, #8f7ad6, #B9A1DD)',
            transition: dragging ? 'none' : 'width 0.15s linear',
          }}
        />
      </div>
      {/* handle dot */}
      <div
        style={{
          position: 'absolute',
          left: `calc(${fraction * 100}% - 5px)`,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: '#B9A1DD',
          boxShadow: '0 0 6px rgba(185,161,221,0.5)',
          transition: dragging ? 'none' : 'left 0.15s linear',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

/* -------------------------- volume slider -------------------------------- */

function VolumeSlider({
  volume,
  muted,
  onChange,
}: {
  volume: number;
  muted: boolean;
  onChange: (v: number) => void;
}) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const effective = muted ? 0 : volume;

  const getFraction = useCallback((clientX: number) => {
    const el = barRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }, []);

  return (
    <div
      ref={barRef}
      role="slider"
      aria-label="Volume"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(effective * 100)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') onChange(Math.min(1, volume + 0.05));
        if (e.key === 'ArrowLeft') onChange(Math.max(0, volume - 0.05));
      }}
      onPointerDown={(e) => {
        setDragging(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        onChange(getFraction(e.clientX));
      }}
      onPointerMove={(e) => {
        if (dragging) onChange(getFraction(e.clientX));
      }}
      onPointerUp={() => setDragging(false)}
      style={{
        position: 'relative',
        width: 72,
        height: 18,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        touchAction: 'none',
        flexShrink: 0,
      }}
    >
      <div style={{ width: '100%', height: 3, borderRadius: 2, background: 'rgba(185,161,221,0.15)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${effective * 100}%`,
            height: '100%',
            borderRadius: 2,
            background: 'linear-gradient(90deg, #8f7ad6, #B9A1DD)',
            transition: dragging ? 'none' : 'width 0.15s linear',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: `calc(${effective * 100}% - 4px)`,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#B9A1DD',
          boxShadow: '0 0 4px rgba(185,161,221,0.5)',
          transition: dragging ? 'none' : 'left 0.15s linear',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

/* --------------------------- main component ------------------------------ */

export const MusicPlayer = ({
  playing,
  muted,
  volume,
  currentTime,
  duration,
  track,
  mode,
  musicEnabled,
  error,
  togglePlay,
  toggleMute,
  setVolume,
  seek,
}: PlayerProps) => {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6, ease: 'easeOut' }}
      role="region"
      aria-label="Music player"
      style={{
        width: '100%',
        maxWidth: 380,
        background: 'rgba(48, 43, 58, 0.55)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: 20,
        border: '1px solid rgba(185,161,221,0.14)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(185,161,221,0.06) inset, 0 0 20px rgba(185,161,221,0.05)',
        padding: '14px 16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* top row: art + info + controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* album art */}
        <AlbumArt mode={mode} />

        {/* title + subtitle + progress */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary, #F6EBDC)',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {track.title}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: 'var(--text-secondary, #ADA6B8)',
              lineHeight: 1.2,
              marginBottom: 2,
            }}
          >
            {track.modeLabel} · Sage
          </div>

          {/* progress bar */}
          <ProgressBar current={currentTime} duration={duration} onSeek={seek} disabled={!musicEnabled} />

          {/* times */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 10.5,
              color: 'var(--text-secondary, #ADA6B8)',
              opacity: 0.8,
              marginTop: -2,
            }}
          >
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* control cluster */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
          {/* mute */}
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary, #ADA6B8)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s',
              borderRadius: 6,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#B9A1DD'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary, #ADA6B8)'; }}
          >
            <IconVolume muted={muted} />
          </button>

          {/* volume slider */}
          <VolumeSlider volume={volume} muted={muted} onChange={setVolume} />

          {/* play / pause — prominent circular button */}
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: 'none',
              background: playing
                ? 'linear-gradient(135deg, #8f7ad6, #B9A1DD)'
                : 'linear-gradient(135deg, #6b52a8, #8f7ad6)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(143,122,214,0.4)',
              transition: 'transform 0.15s ease, box-shadow 0.2s ease, background 0.3s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!reduced) e.currentTarget.style.transform = 'scale(1.08)';
              e.currentTarget.style.boxShadow = '0 2px 18px rgba(143,122,214,0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 12px rgba(143,122,214,0.4)';
            }}
          >
            {playing ? <IconPause size={16} /> : <IconPlay size={16} />}
          </button>
        </div>
      </div>

      {/* error message */}
      {error && musicEnabled && (
        <div
          style={{
            fontSize: 10.5,
            color: 'var(--color-peach-ui, #ffb3a7)',
            opacity: 0.8,
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}
    </motion.div>
  );
};

MusicPlayer.displayName = 'MusicPlayer';
