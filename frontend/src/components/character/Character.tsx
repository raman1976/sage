import { motion, useMotionValue, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { SageMode, SageExpression } from '../../types';

export type SageAvatar = 'lavender' | 'cat' | 'bee' | 'ladybug';

/** Cycle order for the ✨ button: Bee → Cat → Lavender → Ladybug → Bee. */
export const AVATAR_ORDER: SageAvatar[] = ['bee', 'cat', 'lavender', 'ladybug'];

export const nextAvatar = (current: SageAvatar): SageAvatar =>
  AVATAR_ORDER[(AVATAR_ORDER.indexOf(current) + 1) % AVATAR_ORDER.length];

interface CharacterProps {
  mode: SageMode;
  expression?: SageExpression;
  className?: string;
  size?: number;
  avatar?: SageAvatar;
}

interface AvatarPalette {
  headHi: string;
  head: string;
  headMid: string;
  headDark: string;
  bodyHi: string;
  bodyMid: string;
  bodyDark: string;
  ear: string;
  earInner: string;
  pattern: string;
  shadow: string;
  shadowMid: string;
  shadowSoft: string;
}

const AVATAR_PALETTES: Record<SageAvatar, AvatarPalette> = {
  lavender: {
    headHi: 'var(--sage-hood-hi)', head: 'var(--sage-hood)', headMid: '#A189CF', headDark: 'var(--sage-hood-dark)',
    bodyHi: '#C4B1E4', bodyMid: '#A690D2', bodyDark: 'var(--sage-hood-dark)',
    ear: 'var(--sage-cat-ear)', earInner: 'var(--sage-face-hi)',
    pattern: 'rgba(255,255,255,0)',
    shadow: 'rgba(96,76,160,0.30)', shadowMid: 'rgba(96,76,160,0.22)', shadowSoft: 'rgba(96,76,160,0.16)',
  },
  cat: {
    headHi: '#FDD3E3', head: '#F6A9C9', headMid: '#EE8FBB', headDark: '#E27BA8',
    bodyHi: '#FDD3E3', bodyMid: '#EE8FBB', bodyDark: '#E27BA8',
    ear: '#F6A9C9', earInner: '#FBE0EC',
    pattern: 'rgba(255,255,255,0)',
    shadow: 'rgba(184,72,122,0.30)', shadowMid: 'rgba(184,72,122,0.24)', shadowSoft: 'rgba(184,72,122,0.16)',
  },
  bee: {
    headHi: '#FFE687', head: '#FFD23F', headMid: '#F4B923', headDark: '#E8A81E',
    bodyHi: '#FFE07A', bodyMid: '#F4B923', bodyDark: '#E8A81E',
    ear: '#5A3A1A', earInner: '#FFE687',
    pattern: '#5A3A1A',
    shadow: 'rgba(170,120,20,0.30)', shadowMid: 'rgba(170,120,20,0.24)', shadowSoft: 'rgba(170,120,20,0.16)',
  },
  ladybug: {
    headHi: '#F26B62', head: '#E23B34', headMid: '#CC2B26', headDark: '#B2231E',
    bodyHi: '#F26B62', bodyMid: '#CC2B26', bodyDark: '#B2231E',
    ear: '#E23B34', earInner: '#F26B62',
    pattern: '#1C1414',
    shadow: 'rgba(110,15,12,0.35)', shadowMid: 'rgba(110,15,12,0.26)', shadowSoft: 'rgba(110,15,12,0.18)',
  },
};

interface ExpressionConfig {
  eyeOpen: number;
  highlight: 'round' | 'star' | 'none';
  mouth: 'smile' | 'open' | 'calm' | 'o';
  cheek: number;
  eyeScaleY: number;
  eyeOffsetY: number;
  browLift: number;
  browRot: number;
  tilt: number;
  sway: number;
  blinkRate: number;
}

const EXPRESSIONS: Record<SageExpression, ExpressionConfig> = {
  happy:   { eyeOpen: 1, highlight: 'round', mouth: 'smile', cheek: 0.7,  eyeScaleY: 1,    eyeOffsetY: 0,  browLift: 0,  browRot: -6,  tilt: 0,  sway: 1,   blinkRate: 1 },
  blink:   { eyeOpen: 0, highlight: 'round', mouth: 'smile', cheek: 0.65, eyeScaleY: 1,    eyeOffsetY: 0,  browLift: 0,  browRot: -4,  tilt: 0,  sway: 1,   blinkRate: 1 },
  excited: { eyeOpen: 1, highlight: 'star',  mouth: 'open',  cheek: 0.95, eyeScaleY: 1.12, eyeOffsetY: -1, browLift: -3, browRot: -12, tilt: 0,  sway: 1.4, blinkRate: 0.8 },
  calm:    { eyeOpen: 0, highlight: 'none',  mouth: 'calm',  cheek: 0.55, eyeScaleY: 1,    eyeOffsetY: 0,  browLift: 1,  browRot: -3,  tilt: 0,  sway: 0.5, blinkRate: 0.5 },
  curious: { eyeOpen: 1, highlight: 'round', mouth: 'o',     cheek: 0.5,  eyeScaleY: 1.05, eyeOffsetY: -4, browLift: -5, browRot: -8,  tilt: -5, sway: 0.7, blinkRate: 1 },
};

const MODE_EXPRESSION: Record<SageMode, SageExpression> = {
  idle: 'happy',
  listening: 'curious',
  thinking: 'curious',
  focus: 'calm',
  calm: 'calm',
  companion: 'happy',
  plan: 'happy',
};

export const expressionForMode = (mode: SageMode): SageExpression => MODE_EXPRESSION[mode] ?? 'happy';

/** Ambient glow level per mode. Plan brightens via the excited flash (see below). */
const MODE_GLOW: Record<SageMode, number> = {
  idle: 0.7,
  companion: 0.85,
  focus: 0.6,
  calm: 0.5,
  plan: 0.7,
  listening: 0.7,
  thinking: 0.7,
};

const BASE_W = 300;
const BASE_H = 360;

const HOOD = { left: 42, top: 74, size: 204 };
const FACE = { left: 54, top: 88, size: 172 };
const BODY = { left: 22, top: 248, width: 236, height: 110 };
const BODY_RADIUS = '50% 50% 42% 42% / 74% 74% 26% 26%';
/* Ladybug gets a wider, smoother, lower body so it reads as one rounded shell. */
const LADYBUG_BODY = { left: 24, top: 240, width: 240, height: 118 };
const LADYBUG_BODY_RADIUS = '50% 50% 44% 44% / 58% 58% 42% 42%';
const NECK = { x: HOOD.left + HOOD.size / 2, y: HOOD.top + HOOD.size - 2 };

const EYE_W = 54;
const EYE_H = 58;
const EYE_TOP = 40;
const EYE_LEFT_L = 27;
const EYE_LEFT_R = 103;

export const Character = ({ mode, expression, className = '', size = 1, avatar = 'bee' }: CharacterProps) => {
  const resolved: SageExpression = expression ?? expressionForMode(mode);
  const palette = AVATAR_PALETTES[avatar];

  const [tempExpression, setTempExpression] = useState<SageExpression | null>(null);
  const tempTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (tempTimerRef.current) {
      window.clearTimeout(tempTimerRef.current);
      tempTimerRef.current = null;
    }
    if (mode === 'companion') {
      setTempExpression('excited');
      tempTimerRef.current = window.setTimeout(() => setTempExpression(null), 1300);
    } else {
      setTempExpression(null);
    }
    return () => {
      if (tempTimerRef.current) {
        window.clearTimeout(tempTimerRef.current);
        tempTimerRef.current = null;
      }
    };
  }, [mode]);

  const activeExpression: SageExpression = tempExpression ?? resolved;
  const expressionConfig = EXPRESSIONS[activeExpression];
  const exprRef = useRef(expressionConfig);
  exprRef.current = expressionConfig;

  const breath = useMotionValue(0);
  const eyeOpenMV = useMotionValue(expressionConfig.eyeOpen);

  const eyeWidthMV = useMotionValue(EYE_W);
  const eyeHeightMV = useMotionValue(EYE_H * expressionConfig.eyeScaleY);
  const eyeTopMV = useMotionValue(EYE_TOP + expressionConfig.eyeOffsetY);
  const eyeXMV = useMotionValue(0);
  const gazeXMV = useMotionValue(0);
  const gazeYMV = useMotionValue(0);
  const highlightOpacityMV = useMotionValue(expressionConfig.highlight !== 'none' ? 1 : 0);
  const browRotateMV = useMotionValue(expressionConfig.browRot);
  const browYMV = useMotionValue(expressionConfig.browLift);
  const cheekOpacityMV = useMotionValue(expressionConfig.cheek);
  const headTiltMV = useMotionValue(expressionConfig.tilt);
  const earLeftRotateMV = useMotionValue(17);
  const earRightRotateMV = useMotionValue(-17);
  const bodyRotateMV = useMotionValue(0);
  const glowMV = useMotionValue(MODE_GLOW[mode] ?? 0.7);

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const tempExprRef = useRef<SageExpression | null>(null);
  tempExprRef.current = tempExpression;

  const smoothRef = useRef({
    eyeOpen: expressionConfig.eyeOpen,
    eyeScaleY: expressionConfig.eyeScaleY,
    eyeOffsetY: expressionConfig.eyeOffsetY,
    browRot: expressionConfig.browRot,
    browY: expressionConfig.browLift,
    cheek: expressionConfig.cheek,
    tilt: expressionConfig.tilt,
    sway: expressionConfig.sway,
    blinkRate: expressionConfig.blinkRate,
    highlightOn: expressionConfig.highlight !== 'none' ? 1 : 0,
    glow: MODE_GLOW[mode] ?? 0.7,
  });

  const blinkRef = useRef({ next: 0, closing: false, start: 0 });

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- interactive eye tracking (pupils + highlights follow the cursor) ---- */
  const rootRef = useRef<HTMLDivElement>(null);
  const gazeTargetRef = useRef({ x: 0, y: 0 });
  const gazeRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (reducedMotion) return;
    const el = rootRef.current;
    if (!el) return;

    const coarse =
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: none), (pointer: coarse)').matches;

    const MAX = 6; // px — keeps pupils comfortably inside the eyes

    // Touch devices: no cursor, so Sage glances around on its own.
    if (coarse) {
      let settle = 0;
      const glance = () => {
        const angle = Math.random() * Math.PI * 2;
        const radius = 2 + Math.random() * 4;
        gazeTargetRef.current = {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius * 0.7,
        };
        if (settle) window.clearTimeout(settle);
        settle = window.setTimeout(() => {
          gazeTargetRef.current = { x: 0, y: 0 };
        }, 700 + Math.random() * 900);
      };
      glance();
      const interval = window.setInterval(glance, 2400 + Math.random() * 1600);
      return () => {
        window.clearInterval(interval);
        if (settle) window.clearTimeout(settle);
      };
    }

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const rect = el.getBoundingClientRect();
      if (!rect.width) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height * 0.42;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const strength = Math.min(1, dist / 240);
      gazeTargetRef.current = {
        x: (dx / dist) * MAX * strength,
        y: (dy / dist) * MAX * 0.8 * strength,
      };
    };
    const reset = () => {
      gazeTargetRef.current = { x: 0, y: 0 };
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', reset);
      window.removeEventListener('blur', reset);
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) {
      const c = exprRef.current;
      eyeOpenMV.set(c.eyeOpen);
      eyeHeightMV.set(EYE_H * c.eyeScaleY);
      eyeTopMV.set(EYE_TOP + c.eyeOffsetY);
      cheekOpacityMV.set(c.cheek);
      browRotateMV.set(c.browRot);
      browYMV.set(c.browLift);
      headTiltMV.set(c.tilt);
      highlightOpacityMV.set(c.highlight !== 'none' ? 1 : 0);
      glowMV.set(MODE_GLOW[modeRef.current] ?? 0.7);
      gazeXMV.set(0);
      gazeYMV.set(0);
      return;
    }

    let raf = 0;
    const k = 0.09;

    const animate = (time: number) => {
      const t = time * 0.001;
      const e = exprRef.current;
      const s = smoothRef.current;

      s.eyeOpen += (e.eyeOpen - s.eyeOpen) * k;
      s.eyeScaleY += (e.eyeScaleY - s.eyeScaleY) * k;
      s.eyeOffsetY += (e.eyeOffsetY - s.eyeOffsetY) * k;
      s.browRot += (e.browRot - s.browRot) * k;
      s.browY += (e.browLift - s.browY) * k;
      s.cheek += (e.cheek - s.cheek) * k;
      s.tilt += (e.tilt - s.tilt) * k;
      s.sway += (e.sway - s.sway) * k;
      s.blinkRate += (e.blinkRate - s.blinkRate) * k;
      s.highlightOn += ((e.highlight !== 'none' ? 1 : 0) - s.highlightOn) * k;

      breath.set(Math.sin(t * 0.9));
      bodyRotateMV.set(Math.sin(t * 0.5) * 0.6 * s.sway);
      earLeftRotateMV.set(17 + Math.sin(t * 2.2) * 1.6);
      earRightRotateMV.set(-17 + Math.sin(t * 2.2 + 1.3) * 1.6);

      // Natural blink overlay: only when the eyes are open, every 3-6s.
      const b = blinkRef.current;
      if (!b.closing && s.eyeOpen > 0.5 && time >= b.next) {
        b.closing = true;
        b.start = time;
      }
      let blinkFactor = 1;
      if (b.closing) {
        const phase = (time - b.start) / 150;
        if (phase >= 1) {
          b.closing = false;
          const interval = 3000 + Math.random() * 3000;
          b.next = time + interval;
        } else {
          blinkFactor = phase < 0.5 ? 1 - phase * 2 : (phase - 0.5) * 2;
        }
      }
      if (b.next === 0) b.next = time + 2000 + Math.random() * 2000;

      eyeOpenMV.set(s.eyeOpen * blinkFactor);
      eyeHeightMV.set(EYE_H * s.eyeScaleY * blinkFactor);
      eyeWidthMV.set(EYE_W * (0.9 + 0.1 * blinkFactor));
      eyeTopMV.set(EYE_TOP + (1 - blinkFactor) * 10 + s.eyeOffsetY);
      eyeXMV.set(s.tilt * 0.25);

      // Smoothly ease the pupils + highlights toward the gaze target.
      const gz = gazeRef.current;
      gz.x += (gazeTargetRef.current.x - gz.x) * 0.08;
      gz.y += (gazeTargetRef.current.y - gz.y) * 0.08;
      gazeXMV.set(gz.x);
      gazeYMV.set(gz.y);

      highlightOpacityMV.set(s.highlightOn * blinkFactor);
      browRotateMV.set(s.browRot);
      browYMV.set(s.browY);
      cheekOpacityMV.set(s.cheek);
      headTiltMV.set(s.tilt + Math.sin(t * 0.35) * 1.3 * s.sway);

      // Mode-aware ambient glow. Brightens while the excited flash is active
      // (e.g. Plan task completion), then settles back to the mode level.
      const glowTarget = Math.min(
        1,
        (MODE_GLOW[modeRef.current] ?? 0.7) + (tempExprRef.current === 'excited' ? 0.3 : 0),
      );
      s.glow += (glowTarget - s.glow) * k;
      glowMV.set(s.glow);

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  const containerY = useTransform(breath, (v) => v * 1.6);
  const containerScaleY = useTransform(breath, (v) => 1 - v * 0.008);

  return (
    <div
      ref={rootRef}
      className={`sage-character ${className}`}
      style={{
        position: 'relative',
        width: `calc(${BASE_W}px * var(--sage-char-scale, 1))`,
        height: `calc(${BASE_H}px * var(--sage-char-scale, 1))`,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          width: BASE_W,
          height: BASE_H,
          transformOrigin: 'center bottom',
          transform: `translateX(-50%) scale(calc(${size} * var(--sage-char-scale, 1)))`,
        }}
      >
        <motion.div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            x: '-50%',
            width: BASE_W,
            height: BASE_H,
            y: containerY,
            scaleY: containerScaleY,
            transformOrigin: 'center bottom',
          }}
        >
          <AmbientHalo glowMV={glowMV} />
          <GroundGlow glowMV={glowMV} redGlow={avatar === 'ladybug'} />
          <Decorations mode={mode} />

          <AvatarBackdrop avatar={avatar} palette={palette} />

          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              rotate: headTiltMV,
              transformOrigin: `${NECK.x}px ${NECK.y}px`,
              zIndex: avatar === 'ladybug' ? 7 : undefined,
            }}
          >
            <AvatarHeadBack
              avatar={avatar}
              palette={palette}
              earLeftRotateMV={earLeftRotateMV}
              earRightRotateMV={earRightRotateMV}
            />
            <Hood palette={palette} avatar={avatar} />
            <Face
              mouth={expressionConfig.mouth}
              highlight={expressionConfig.highlight}
              eyeOpenMV={eyeOpenMV}
              eyeLeftL={EYE_LEFT_L}
              eyeLeftR={EYE_LEFT_R}
              eyeTopMV={eyeTopMV}
              eyeWidthMV={eyeWidthMV}
              eyeHeightMV={eyeHeightMV}
              eyeXMV={eyeXMV}
              gazeXMV={gazeXMV}
              gazeYMV={gazeYMV}
              highlightOpacityMV={highlightOpacityMV}
              browRotateMV={browRotateMV}
              browYMV={browYMV}
              cheekOpacityMV={cheekOpacityMV}
            />
            <AvatarFaceExtras avatar={avatar} />
            {avatar === 'lavender' && <Star />}
          </motion.div>

          <motion.div
            style={{
              position: 'absolute',
              top: avatar === 'ladybug' ? LADYBUG_BODY.top : BODY.top,
              left: avatar === 'ladybug' ? LADYBUG_BODY.left : BODY.left,
              width: avatar === 'ladybug' ? LADYBUG_BODY.width : BODY.width,
              height: avatar === 'ladybug' ? LADYBUG_BODY.height : BODY.height,
              background:
                `radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0) 30%), radial-gradient(ellipse at 50% 4%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 48%), linear-gradient(180deg, ${palette.bodyHi} 0%, ${palette.head} 42%, ${palette.bodyMid} 78%, ${palette.bodyDark} 100%)`,
              borderRadius: avatar === 'ladybug' ? LADYBUG_BODY_RADIUS : BODY_RADIUS,
              boxShadow:
                `inset 0 -16px 26px ${palette.shadow}, inset 7px 0 18px ${palette.shadowSoft}, inset -7px 0 18px ${palette.shadowSoft}, 0 10px 24px rgba(0,0,0,0.15)`,
              transformOrigin: '50% 100%',
              rotate: bodyRotateMV,
              zIndex: 6,
            }}
          >
            <AvatarBodyPattern avatar={avatar} palette={palette} />
            {avatar !== 'ladybug' && (
              <>
                <Paw side="left" />
                <Paw side="right" />
              </>
            )}
          </motion.div>

          <AvatarFeet avatar={avatar} />
        </motion.div>
      </div>
    </div>
  );
};

Character.displayName = 'Character';

const AmbientHalo = ({ glowMV }: { glowMV: MotionValue<number> }) => {
  const haloOpacity = useTransform(glowMV, (g) => 0.3 + g * 0.4);
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: '50%',
        top: '46%',
        x: '-50%',
        y: '-50%',
        width: 440,
        height: 440,
        background:
          'radial-gradient(circle at center, rgba(185,161,221,0.16) 0%, rgba(143,122,214,0.07) 42%, rgba(143,122,214,0) 68%)',
        zIndex: 0,
        opacity: haloOpacity,
        pointerEvents: 'none',
      }}
    />
  );
};

const GroundGlow = ({
  glowMV,
  redGlow = false,
}: {
  glowMV: MotionValue<number>;
  redGlow?: boolean;
}) => {
  const glowOpacity = useTransform(glowMV, (g) => 0.5 + g * 0.5);
  const outer = redGlow
    ? 'radial-gradient(ellipse at center, rgba(255,220,214,1) 0%, rgba(255,120,104,0.72) 36%, rgba(232,64,48,0.42) 56%, rgba(232,64,48,0) 80%)'
    : 'radial-gradient(ellipse at center, rgba(255,230,240,1) 0%, rgba(255,170,205,0.75) 35%, rgba(250,120,175,0.4) 55%, rgba(250,120,175,0) 80%)';
  const inner = redGlow
    ? 'radial-gradient(ellipse at center, rgba(255,236,232,1) 0%, rgba(255,140,124,0.62) 50%, rgba(232,64,48,0) 75%)'
    : 'radial-gradient(ellipse at center, rgba(255,240,246,1) 0%, rgba(255,185,215,0.65) 50%, rgba(250,120,175,0) 75%)';
  return (
    <>
      <motion.div
        style={{
          position: 'absolute',
          bottom: -22,
          left: '50%',
          x: '-50%',
          width: 340,
          height: 62,
          background: outer,
          filter: 'blur(8px)',
          zIndex: 0,
          opacity: glowOpacity,
          pointerEvents: 'none',
        }}
      />
      <motion.div
        style={{
          position: 'absolute',
          bottom: -10,
          left: '50%',
          x: '-50%',
          width: 230,
          height: 30,
          background: inner,
          filter: 'blur(4px)',
          zIndex: 0,
          opacity: glowOpacity,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -2,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 190,
          height: 18,
          background:
            'radial-gradient(ellipse at center, rgba(20,12,36,0.45) 0%, rgba(20,12,36,0) 70%)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
    </>
  );
};

interface DecorItem {
  kind: 'dot' | 'spark' | 'heart';
  left: number;
  top: number;
  size: number;
  dur: number;
  delay: number;
  op: number;
}

const DECOR: DecorItem[] = [
  { kind: 'heart', left: 16, top: 148, size: 14, dur: 7, delay: 0, op: 0.8 },
  { kind: 'dot', left: 30, top: 88, size: 5, dur: 6, delay: 1, op: 0.7 },
  { kind: 'spark', left: 258, top: 116, size: 12, dur: 8, delay: 0.5, op: 0.85 },
  { kind: 'heart', left: 266, top: 188, size: 11, dur: 7.5, delay: 2, op: 0.7 },
  { kind: 'dot', left: 50, top: 248, size: 4, dur: 5.5, delay: 1.5, op: 0.6 },
  { kind: 'spark', left: 244, top: 58, size: 9, dur: 9, delay: 3, op: 0.7 },
  { kind: 'dot', left: 88, top: 28, size: 4, dur: 6.5, delay: 2.5, op: 0.55 },
];

const Decorations = ({ mode }: { mode: SageMode }) => {
  const still = mode === 'focus';
  const dim = mode === 'calm' ? 0.55 : mode === 'focus' ? 0.6 : 1;
  const slow = mode === 'calm' ? 1.6 : 1;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      {DECOR.map((d, i) => (
        <div
          key={i}
          className="sage-decor"
          style={{
            position: 'absolute',
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            ['--sage-decor-op' as string]: d.op * dim,
            animationDuration: `${d.dur * slow}s`,
            animationDelay: `${d.delay}s`,
            animationPlayState: still ? 'paused' : 'running',
          }}
        >
          {d.kind === 'dot' && (
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, #FFFFFF 0%, var(--sage-hood-hi) 60%, var(--sage-hood) 100%)',
                boxShadow: '0 0 6px rgba(201,182,232,0.8)',
              }}
            />
          )}
          {d.kind === 'spark' && (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(180deg, #FFFFFF 0%, var(--sage-hood-hi) 100%)',
                clipPath:
                  'polygon(50% 0%, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0% 50%, 38% 38%)',
                filter: 'drop-shadow(0 0 4px rgba(201,182,232,0.9))',
              }}
            />
          )}
          {d.kind === 'heart' && (
            <svg width={d.size} height={d.size} viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 0 4px rgba(255,199,216,0.8))' }}>
              <path
                d="M12 21 C5 15 2 11 2 7.5 C2 4.5 4.5 2.5 7 2.5 C9 2.5 11 4 12 6 C13 4 15 2.5 17 2.5 C19.5 2.5 22 4.5 22 7.5 C22 11 19 15 12 21 Z"
                fill="#FFC7D8"
                opacity={0.9}
              />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
};

const FloppyEar = ({
  side,
  rotateMV,
}: {
  side: 'left' | 'right';
  rotateMV: MotionValue<number>;
}) => (
  <motion.div
    style={{
      position: 'absolute',
      top: 126,
      left: side === 'left' ? 43 : 195,
      width: 62,
      height: 138,
      background:
        side === 'left'
          ? 'radial-gradient(ellipse at 42% 35%, var(--sage-face-hi) 0%, var(--sage-face) 55%, var(--sage-face-shade) 100%)'
          : 'radial-gradient(ellipse at 58% 35%, var(--sage-face-hi) 0%, var(--sage-face) 55%, var(--sage-face-shade) 100%)',
      borderRadius: '50% 50% 44% 44% / 56% 56% 44% 44%',
      boxShadow:
        side === 'left'
          ? 'inset -7px 2px 12px rgba(176,154,130,0.22), inset 3px 0 8px rgba(143,122,214,0.14), 0 6px 14px rgba(0,0,0,0.10)'
          : 'inset 7px 2px 12px rgba(176,154,130,0.22), inset -3px 0 8px rgba(143,122,214,0.14), 0 6px 14px rgba(0,0,0,0.10)',
      transformOrigin: '50% 6%',
      zIndex: 1,
      rotate: rotateMV,
    }}
  />
);

const CatEar = ({ side }: { side: 'left' | 'right' }) => (
  <div
    style={{
      position: 'absolute',
      top: 40,
      left: side === 'left' ? 68 : 180,
      width: 0,
      height: 0,
      borderLeft: '26px solid transparent',
      borderRight: '26px solid transparent',
      borderBottom: `54px solid var(--sage-cat-ear)`,
      transform: `rotate(${side === 'left' ? -12 : 12}deg)`,
      transformOrigin: '50% 100%',
      filter: 'drop-shadow(0 3px 4px rgba(60,40,110,0.40))',
      zIndex: 2,
    }}
  />
);

const Hood = ({ palette, avatar }: { palette: AvatarPalette; avatar: SageAvatar }) => (
  <div
    style={{
      position: 'absolute',
      top: HOOD.top,
      left: HOOD.left,
      width: HOOD.size,
      height: HOOD.size,
      background:
        `radial-gradient(ellipse at 50% 10%, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0) 42%), radial-gradient(circle at 50% 30%, ${palette.headHi} 0%, ${palette.head} 48%, ${palette.headMid} 84%, ${palette.headDark} 100%)`,
      borderRadius: '50%',
      boxShadow:
        `inset 0 -14px 28px ${palette.shadow}, inset 0 10px 18px rgba(255,255,255,0.16), inset 0 0 30px ${palette.shadowMid}, 0 12px 28px rgba(0,0,0,0.15)`,
      zIndex: 3,
      overflow: 'hidden',
    }}
  >
    <AvatarHeadPattern avatar={avatar} palette={palette} />
  </div>
);

interface FaceProps {
  mouth: ExpressionConfig['mouth'];
  highlight: ExpressionConfig['highlight'];
  eyeOpenMV: MotionValue<number>;
  eyeLeftL: number;
  eyeLeftR: number;
  eyeTopMV: MotionValue<number>;
  eyeWidthMV: MotionValue<number>;
  eyeHeightMV: MotionValue<number>;
  eyeXMV: MotionValue<number>;
  gazeXMV: MotionValue<number>;
  gazeYMV: MotionValue<number>;
  highlightOpacityMV: MotionValue<number>;
  browRotateMV: MotionValue<number>;
  browYMV: MotionValue<number>;
  cheekOpacityMV: MotionValue<number>;
}

const Face = ({
  mouth,
  highlight,
  eyeOpenMV,
  eyeLeftL,
  eyeLeftR,
  eyeTopMV,
  eyeWidthMV,
  eyeHeightMV,
  eyeXMV,
  gazeXMV,
  gazeYMV,
  highlightOpacityMV,
  browRotateMV,
  browYMV,
  cheekOpacityMV,
}: FaceProps) => (
  <div
    style={{
      position: 'absolute',
      top: FACE.top,
      left: FACE.left,
      width: FACE.size,
      height: FACE.size,
      background:
        'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 62%, rgba(143,122,214,0.14) 100%), radial-gradient(circle at 42% 34%, var(--sage-face-hi) 0%, var(--sage-face) 55%, var(--sage-face-shade) 100%)',
      borderRadius: '50%',
      boxShadow:
        'inset 0 -8px 16px rgba(184,160,138,0.20), inset 0 6px 10px rgba(255,255,255,0.55), inset 0 0 22px rgba(143,122,214,0.12), 0 4px 14px rgba(0,0,0,0.08)',
      zIndex: 4,
    }}
  >
    <Eye
      side="left"
      left={eyeLeftL}
      topMV={eyeTopMV}
      widthMV={eyeWidthMV}
      heightMV={eyeHeightMV}
      xMV={eyeXMV}
      gazeXMV={gazeXMV}
      gazeYMV={gazeYMV}
      eyeOpenMV={eyeOpenMV}
      highlight={highlight}
      highlightOpacityMV={highlightOpacityMV}
      browRotateMV={browRotateMV}
      browYMV={browYMV}
    />
    <Eye
      side="right"
      left={eyeLeftR}
      topMV={eyeTopMV}
      widthMV={eyeWidthMV}
      heightMV={eyeHeightMV}
      xMV={eyeXMV}
      gazeXMV={gazeXMV}
      gazeYMV={gazeYMV}
      eyeOpenMV={eyeOpenMV}
      highlight={highlight}
      highlightOpacityMV={highlightOpacityMV}
      browRotateMV={browRotateMV}
      browYMV={browYMV}
    />
    <Cheek side="left" opacityMV={cheekOpacityMV} />
    <Cheek side="right" opacityMV={cheekOpacityMV} />
    <Mouth type={mouth} />
  </div>
);

interface EyeProps {
  side: 'left' | 'right';
  left: number;
  topMV: MotionValue<number>;
  widthMV: MotionValue<number>;
  heightMV: MotionValue<number>;
  xMV: MotionValue<number>;
  gazeXMV: MotionValue<number>;
  gazeYMV: MotionValue<number>;
  eyeOpenMV: MotionValue<number>;
  highlight: ExpressionConfig['highlight'];
  highlightOpacityMV: MotionValue<number>;
  browRotateMV: MotionValue<number>;
  browYMV: MotionValue<number>;
}

const Eye = ({
  side,
  left,
  topMV,
  widthMV,
  heightMV,
  xMV,
  gazeXMV,
  gazeYMV,
  eyeOpenMV,
  highlight,
  highlightOpacityMV,
  browRotateMV,
  browYMV,
}: EyeProps) => {
  const mirrored = side === 'right';
  const closedOpacity = useTransform(eyeOpenMV, (o) => 1 - o);
  const centerX = left + EYE_W / 2;
  const closedTop = useTransform(topMV, (t) => t + EYE_H * 0.42);
  const closedW = EYE_W * 0.92;

  return (
    <>
      {/* Open eye (brown glossy oval with highlights) */}
      <motion.div
        style={{
          position: 'absolute',
          left,
          top: topMV,
          width: widthMV,
          height: heightMV,
          x: xMV,
          opacity: eyeOpenMV,
          background:
            'radial-gradient(circle at 34% 28%, var(--sage-eye-hi) 0%, var(--sage-eye) 52%, var(--sage-eye-deep) 100%)',
          borderRadius: '50%',
          boxShadow:
            'inset 0 -4px 8px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.10)',
          overflow: 'hidden',
          zIndex: 5,
        }}
      >
        {/* pupil — eases with the gaze; the eyeball itself stays in place */}
        <motion.div
          style={{
            position: 'absolute',
            top: EYE_H * 0.21,
            left: EYE_W * 0.23,
            width: EYE_W * 0.54,
            height: EYE_H * 0.64,
            x: gazeXMV,
            y: gazeYMV,
            background:
              'radial-gradient(circle at 40% 32%, var(--sage-eye) 0%, var(--sage-eye-deep) 60%, #0f0a06 100%)',
            borderRadius: '50%',
          }}
        />

        {/* highlights drift with the pupil for a lifelike effect */}
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            x: gazeXMV,
            y: gazeYMV,
          }}
        >
        {highlight === 'star' ? (
          <>
            <motion.div
              style={{
                position: 'absolute',
                top: 4,
                left: mirrored ? 26 : 3,
                width: 22,
                height: 22,
                background: '#FFFFFF',
                clipPath:
                  'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                opacity: highlightOpacityMV,
              }}
            />
            <motion.div
              style={{
                position: 'absolute',
                top: 30,
                left: mirrored ? 12 : 34,
                width: 11,
                height: 11,
                background: '#FFFFFF',
                clipPath:
                  'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                opacity: highlightOpacityMV,
              }}
            />
          </>
        ) : (
          <>
            <motion.div
              style={{
                position: 'absolute',
                top: 7,
                left: mirrored ? 31 : 8,
                width: 15,
                height: 15,
                background: '#FFFFFF',
                borderRadius: '50%',
                filter: 'blur(0.5px)',
                opacity: highlightOpacityMV,
              }}
            />
            <motion.div
              style={{
                position: 'absolute',
                top: 36,
                left: mirrored ? 10 : 37,
                width: 7,
                height: 7,
                background: 'rgba(255,255,255,0.8)',
                borderRadius: '50%',
                opacity: highlightOpacityMV,
              }}
            />
          </>
        )}
        </motion.div>
      </motion.div>

      {/* Closed eye (∩ arc), fades in as the open eye fades out */}
      <motion.svg
        width={closedW}
        height={EYE_H * 0.5}
        viewBox={`0 0 ${closedW} ${EYE_H * 0.5}`}
        style={{
          position: 'absolute',
          left: centerX - closedW / 2,
          top: closedTop,
          x: xMV,
          opacity: closedOpacity,
          overflow: 'visible',
          zIndex: 5,
        }}
      >
        <path
          d={`M ${closedW * 0.08} ${EYE_H * 0.34} Q ${closedW / 2} ${EYE_H * 0.02} ${closedW * 0.92} ${EYE_H * 0.34}`}
          fill="none"
          stroke="var(--sage-eye)"
          strokeWidth={4}
          strokeLinecap="round"
        />
      </motion.svg>

      <motion.div
        style={{
          position: 'absolute',
          top: 26,
          left: mirrored ? 116 : 40,
          width: 28,
          height: 7,
          background: 'transparent',
          borderTop: '2px solid rgba(75,58,46,0.35)',
          borderRadius: '50% 50% 0 0',
          transformOrigin: 'center',
          rotate: browRotateMV,
          y: browYMV,
          zIndex: 4,
        }}
      />
    </>
  );
};

const Cheek = ({
  side,
  opacityMV,
}: {
  side: 'left' | 'right';
  opacityMV: MotionValue<number>;
}) => (
  <motion.div
    style={{
      position: 'absolute',
      top: 98,
      left: side === 'left' ? 16 : 122,
      width: 46,
      height: 36,
      background:
        'radial-gradient(ellipse at center, var(--sage-blush) 0%, rgba(255,199,216,0.55) 45%, rgba(255,199,216,0) 72%)',
      borderRadius: '50%',
      filter: 'blur(5px)',
      opacity: opacityMV,
      zIndex: 3,
    }}
  />
);

const Mouth = ({ type }: { type: ExpressionConfig['mouth'] }) => {
  const base: React.CSSProperties = {
    position: 'absolute',
    top: 122,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 5,
  };

  if (type === 'open') {
    return (
      <div
        style={{
          ...base,
          top: 118,
          width: 34,
          height: 26,
          background:
            'radial-gradient(ellipse at center, #F09AB0 0%, #E8829E 100%)',
          borderRadius: '50% 50% 42% 42%',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.12)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 18,
            height: 12,
            background: 'linear-gradient(180deg, #FF9FB2 0%, #F27E97 100%)',
            borderRadius: '0 0 50% 50%',
          }}
        />
      </div>
    );
  }

  if (type === 'o') {
    return (
      <div
        style={{
          ...base,
          top: 124,
          width: 16,
          height: 16,
          background:
            'radial-gradient(circle at 40% 35%, #7A5A46 0%, var(--sage-eye) 100%)',
          borderRadius: '50%',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
        }}
      />
    );
  }

  if (type === 'calm') {
    return (
      <div
        style={{
          ...base,
          top: 126,
          width: 28,
          height: 12,
          background: 'transparent',
          borderBottom: '2px solid rgba(75,58,46,0.8)',
          borderRadius: '0 0 50% 50% / 0 0 100% 100%',
        }}
      />
    );
  }

  return (
    <div
      style={{
        ...base,
        width: 34,
        height: 16,
        background: 'transparent',
        borderBottom: '3px solid var(--sage-eye)',
        borderRadius: '0 0 50% 50% / 0 0 100% 100%',
      }}
    />
  );
};

const Paw = ({ side }: { side: 'left' | 'right' }) => (
  <div
    style={{
      position: 'absolute',
      bottom: 0,
      left: side === 'left' ? 45 : 153,
      width: 54,
      height: 30,
      background: 'linear-gradient(180deg, var(--sage-face-hi) 0%, var(--sage-face) 55%, var(--sage-face-shade) 100%)',
      borderRadius: '50% 50% 36% 36% / 94% 94% 10% 10%',
      boxShadow: 'inset 0 -3px 6px rgba(176,154,130,0.28), inset 0 2px 3px rgba(255,255,255,0.5), 0 3px 6px rgba(0,0,0,0.10)',
    }}
  />
);

const Star = () => (
  <div
    style={{
      position: 'absolute',
      top: 41,
      left: 223,
      width: 34,
      height: 34,
      background:
        'linear-gradient(180deg, #FFE7A3 0%, var(--sage-star) 55%, #EFBC4C 100%)',
      clipPath:
        'polygon(50% 0%, 61.8% 35%, 98% 35%, 68% 57%, 79.9% 91%, 50% 70%, 20.1% 91%, 32% 57%, 2% 35%, 38.2% 35%)',
      transform: 'rotate(-6deg)',
      filter: 'drop-shadow(0 3px 6px rgba(255,209,102,0.40))',
      zIndex: 8,
    }}
  />
);

/* ------------------------------ avatar variants --------------------------- */

interface AvatarPartProps {
  palette: AvatarPalette;
}

/** Accessories that sit behind the whole character (tail, wings). */
const AvatarBackdrop = ({ avatar, palette }: { avatar: SageAvatar } & AvatarPartProps) => {
  if (avatar === 'cat') return <CatTail palette={palette} />;
  if (avatar === 'bee') return <BeeWings />;
  if (avatar === 'ladybug') return <LadybugWings palette={palette} />;
  return null;
};

/** Ears / antennae that sit behind the head. Lavender keeps its original parts. */
const AvatarHeadBack = ({
  avatar,
  palette,
  earLeftRotateMV,
  earRightRotateMV,
}: {
  avatar: SageAvatar;
  earLeftRotateMV: MotionValue<number>;
  earRightRotateMV: MotionValue<number>;
} & AvatarPartProps) => {
  if (avatar === 'cat') return <CatEars palette={palette} />;
  if (avatar === 'bee') return <Antennae stemColor="#5A3A1A" tipColor="#FFD23F" />;
  if (avatar === 'ladybug') return <Antennae stemColor="#181014" tipColor="#E23B34" />;
  return (
    <>
      <FloppyEar side="left" rotateMV={earLeftRotateMV} />
      <FloppyEar side="right" rotateMV={earRightRotateMV} />
      <CatEar side="left" />
      <CatEar side="right" />
    </>
  );
};

/** Pattern painted on the coloured head ring (subtle spots for the ladybug). */
const AvatarHeadPattern = ({ avatar, palette }: { avatar: SageAvatar } & AvatarPartProps) => {
  if (avatar !== 'ladybug') return null;
  const spots = [
    { left: 60, top: 0, size: 14 },
    { left: 96, top: -3, size: 15 },
    { left: 130, top: 0, size: 14 },
    { left: -2, top: 54, size: 15 },
    { left: 191, top: 54, size: 15 },
  ];
  return (
    <>
      {spots.map((s, i) => (
        <Spot key={i} left={s.left} top={s.top} size={s.size} color={palette.pattern} opacity={0.6} />
      ))}
    </>
  );
};

/** Details drawn over the face (cat whiskers). */
const AvatarFaceExtras = ({ avatar }: { avatar: SageAvatar }) => {
  if (avatar !== 'cat') return null;
  return <Whiskers color="rgba(150,96,122,0.72)" />;
};

/** Pattern painted on the body shape (bee stripes, ladybug spots). */
const AvatarBodyPattern = ({ avatar, palette }: { avatar: SageAvatar } & AvatarPartProps) => {
  if (avatar === 'bee') {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: BODY_RADIUS,
          overflow: 'hidden',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        {[0.2, 0.5, 0.8].map((f, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${f * 100}%`,
              height: '15%',
              background: palette.pattern,
              opacity: 0.92,
            }}
          />
        ))}
      </div>
    );
  }

  if (avatar === 'ladybug') {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: LADYBUG_BODY_RADIUS,
          overflow: 'hidden',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <Spot left={34} top={28} size={30} color={palette.pattern} />
        <Spot left={176} top={28} size={30} color={palette.pattern} />
        <Spot left={20} top={64} size={26} color={palette.pattern} />
        <Spot left={194} top={64} size={26} color={palette.pattern} />
        <Spot left={102} top={70} size={34} color={palette.pattern} />
        <Spot left={60} top={90} size={28} color={palette.pattern} />
        <Spot left={152} top={90} size={28} color={palette.pattern} />
      </div>
    );
  }

  return null;
};

const Spot = ({
  left,
  top,
  size,
  color,
  opacity = 0.95,
}: {
  left: number;
  top: number;
  size: number;
  color: string;
  opacity?: number;
}) => (
  <div
    style={{
      position: 'absolute',
      left,
      top,
      width: size,
      height: size,
      borderRadius: '50%',
      background: color,
      boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.25)',
      opacity,
    }}
  />
);

/** Two small cream oval feet at the bottom (ladybug). */
const AvatarFeet = ({ avatar }: { avatar: SageAvatar }) => {
  if (avatar !== 'ladybug') return null;
  return (
    <>
      <LadybugFoot left={88} />
      <LadybugFoot left={146} />
    </>
  );
};

const LadybugFoot = ({ left }: { left: number }) => (
  <div
    style={{
      position: 'absolute',
      left,
      bottom: 2,
      width: 54,
      height: 30,
      borderRadius: '50%',
      background:
        'radial-gradient(ellipse at 50% 30%, var(--sage-face-hi) 0%, var(--sage-face) 60%, var(--sage-face-shade) 100%)',
      boxShadow:
        'inset 0 -3px 6px rgba(176,154,130,0.32), inset 0 2px 3px rgba(255,255,255,0.5), 0 3px 6px rgba(0,0,0,0.12)',
      zIndex: 7,
      pointerEvents: 'none',
    }}
  />
);

const CatTail = ({ palette }: AvatarPartProps) => (
  <svg
    width={120}
    height={190}
    viewBox="0 0 120 190"
    style={{
      position: 'absolute',
      right: 0,
      bottom: 0,
      zIndex: 1,
      overflow: 'visible',
      pointerEvents: 'none',
    }}
    aria-hidden
  >
    <path
      d="M16 184 C 76 186 112 150 108 98 C 106 62 86 42 58 50"
      fill="none"
      stroke={palette.head}
      strokeWidth={30}
      strokeLinecap="round"
    />
    <path
      d="M18 182 C 74 184 110 148 106 98 C 104 64 86 44 60 52"
      fill="none"
      stroke={palette.headHi}
      strokeWidth={11}
      strokeLinecap="round"
      opacity={0.55}
    />
  </svg>
);

const CatEars = ({ palette }: AvatarPartProps) => (
  <>
    {(['left', 'right'] as const).map((side) => (
      <div
        key={side}
        style={{
          position: 'absolute',
          top: 36,
          left: side === 'left' ? 62 : 176,
          width: 62,
          height: 66,
          transform: `rotate(${side === 'left' ? -14 : 14}deg)`,
          transformOrigin: '50% 100%',
          zIndex: 2,
          filter: 'drop-shadow(0 3px 4px rgba(150,50,95,0.35))',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(180deg, ${palette.headHi} 0%, ${palette.head} 68%, ${palette.headDark} 100%)`,
            clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '32%',
            transform: 'translateX(-50%)',
            width: 26,
            height: 32,
            background: palette.earInner,
            clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
            opacity: 0.85,
          }}
        />
      </div>
    ))}
  </>
);

const Antennae = ({ stemColor, tipColor }: { stemColor: string; tipColor: string }) => (
  <>
    <Antenna x={114} dir={-1} stemColor={stemColor} tipColor={tipColor} />
    <Antenna x={178} dir={1} stemColor={stemColor} tipColor={tipColor} />
  </>
);

const Antenna = ({
  x,
  dir,
  stemColor,
  tipColor,
}: {
  x: number;
  dir: number;
  stemColor: string;
  tipColor: string;
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: 42,
      width: 8,
      height: 66,
      transformOrigin: '50% 100%',
      transform: `rotate(${dir * 16}deg)`,
      zIndex: 2,
      pointerEvents: 'none',
    }}
  >
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 5,
        height: 56,
        background: stemColor,
        borderRadius: 3,
      }}
    />
    <div
      style={{
        position: 'absolute',
        top: -6,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: tipColor,
        border: `3px solid ${stemColor}`,
        boxShadow: 'inset -3px -3px 5px rgba(0,0,0,0.18)',
      }}
    />
  </div>
);

const Whiskers = ({ color }: { color: string }) => {
  const lines: { side: 'l' | 'r'; top: number; rot: number }[] = [
    { side: 'l', top: 182, rot: -9 },
    { side: 'l', top: 196, rot: 0 },
    { side: 'l', top: 210, rot: 9 },
    { side: 'r', top: 182, rot: 9 },
    { side: 'r', top: 196, rot: 0 },
    { side: 'r', top: 210, rot: -9 },
  ];
  return (
    <>
      {lines.map((ln, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: ln.side === 'l' ? 46 : 196,
            top: ln.top,
            width: 58,
            height: 2.5,
            borderRadius: 2,
            background:
              ln.side === 'l'
                ? `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${color} 30%, ${color} 100%)`
                : `linear-gradient(90deg, ${color} 0%, ${color} 70%, rgba(255,255,255,0) 100%)`,
            transform: `rotate(${ln.rot}deg)`,
            transformOrigin: ln.side === 'l' ? '100% 50%' : '0% 50%',
            zIndex: 5,
            pointerEvents: 'none',
            opacity: 0.85,
          }}
        />
      ))}
    </>
  );
};

const BeeWings = () => (
  <>
    <BeeWing left={16} top={140} rotate={-28} width={82} height={112} origin="70% 70%" />
    <BeeWing left={34} top={198} rotate={-8} width={72} height={86} origin="70% 30%" />
    <BeeWing left={202} top={140} rotate={28} width={82} height={112} origin="30% 70%" />
    <BeeWing left={194} top={198} rotate={8} width={72} height={86} origin="30% 30%" />
  </>
);

const BeeWing = ({
  left,
  top,
  rotate,
  width,
  height,
  origin,
}: {
  left: number;
  top: number;
  rotate: number;
  width: number;
  height: number;
  origin: string;
}) => (
  <div
    style={{
      position: 'absolute',
      left,
      top,
      width,
      height,
      transform: `rotate(${rotate}deg)`,
      transformOrigin: origin,
      borderRadius: '50%',
      background:
        'radial-gradient(ellipse at 42% 30%, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.4) 42%, rgba(206,233,255,0.22) 72%, rgba(206,233,255,0.06) 100%)',
      border: '2px solid rgba(255,255,255,0.55)',
      boxShadow: 'inset 0 0 18px rgba(255,255,255,0.5)',
      zIndex: 1,
      pointerEvents: 'none',
    }}
  />
);

const LadybugWings = ({ palette }: AvatarPartProps) => (
  <>
    <LadybugWing left={0} top={246} rotate={-14} origin="72% 58%" palette={palette} />
    <LadybugWing left={192} top={246} rotate={14} origin="28% 58%" palette={palette} />
  </>
);

const LadybugWing = ({
  left,
  top,
  rotate,
  origin,
  palette,
}: {
  left: number;
  top: number;
  rotate: number;
  origin: string;
} & AvatarPartProps) => (
  <div
    style={{
      position: 'absolute',
      left,
      top,
      width: 96,
      height: 104,
      transform: `rotate(${rotate}deg)`,
      transformOrigin: origin,
      zIndex: 1,
      pointerEvents: 'none',
    }}
  >
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50% 50% 46% 46% / 54% 54% 46% 46%',
        overflow: 'hidden',
        background: `radial-gradient(ellipse at 50% 20%, ${palette.headHi} 0%, ${palette.head} 56%, ${palette.headDark} 100%)`,
        boxShadow: `inset 0 -8px 16px ${palette.shadow}, 0 8px 16px rgba(0,0,0,0.18)`,
        border: `2px solid ${palette.headDark}`,
      }}
    >
      <Spot left={16} top={16} size={24} color={palette.pattern} />
      <Spot left={52} top={44} size={22} color={palette.pattern} />
      <Spot left={22} top={62} size={18} color={palette.pattern} />
    </div>
  </div>
);