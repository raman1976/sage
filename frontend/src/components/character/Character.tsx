import { motion, useMotionValue, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useRef } from 'react';
import type { SageMode } from '../../types';

interface CharacterProps {
  mode: SageMode;
  className?: string;
  size?: number;
}

interface ModeExpression {
  eyeScale: number;
  eyeOffsetY: number;
  eyebrowRotation: number;
  eyebrowHeight: number;
  mouthType: 'smile' | 'open' | 'thinking' | 'calm' | 'neutral';
  cheekOpacity: number;
  headTilt: number;
  bodySway: number;
  blinkSpeed: number;
}

const MODE_EXPRESSIONS: Record<SageMode, ModeExpression> = {
  idle: { eyeScale: 1, eyeOffsetY: 0, eyebrowRotation: -6, eyebrowHeight: 0, mouthType: 'smile', cheekOpacity: 0.65, headTilt: 0, bodySway: 1, blinkSpeed: 1 },
  start: { eyeScale: 1.08, eyeOffsetY: -2, eyebrowRotation: -14, eyebrowHeight: -4, mouthType: 'open', cheekOpacity: 0.85, headTilt: 0, bodySway: 1.5, blinkSpeed: 0.8 },
  focus: { eyeScale: 0.95, eyeOffsetY: 0, eyebrowRotation: -2, eyebrowHeight: 2, mouthType: 'neutral', cheekOpacity: 0.45, headTilt: 0, bodySway: 0.3, blinkSpeed: 1.2 },
  calm: { eyeScale: 0.12, eyeOffsetY: 3, eyebrowRotation: -4, eyebrowHeight: 1, mouthType: 'calm', cheekOpacity: 0.55, headTilt: 0, bodySway: 0.5, blinkSpeed: 0.5 },
  plan: { eyeScale: 0.9, eyeOffsetY: -3, eyebrowRotation: 6, eyebrowHeight: -3, mouthType: 'thinking', cheekOpacity: 0.45, headTilt: 4, bodySway: 0.8, blinkSpeed: 1 },
  listening: { eyeScale: 1.1, eyeOffsetY: -1, eyebrowRotation: -11, eyebrowHeight: -3, mouthType: 'neutral', cheekOpacity: 0.55, headTilt: -3, bodySway: 0.6, blinkSpeed: 0.9 },
  thinking: { eyeScale: 0.88, eyeOffsetY: -5, eyebrowRotation: 7, eyebrowHeight: -4, mouthType: 'thinking', cheekOpacity: 0.35, headTilt: 3, bodySway: 0.7, blinkSpeed: 1.5 },
};

const BASE_W = 300;
const BASE_H = 380;

const HOOD = { left: 42, top: 78, size: 216 };
const FACE = { left: 58, top: 94, size: 184 };
const BODY = { left: 24, top: 264, width: 252, height: 116 };
const NECK = { x: HOOD.left + HOOD.size / 2, y: HOOD.top + HOOD.size - 2 };

const EYE_W = 54;
const EYE_H = 58;
const EYE_TOP = 40;
const EYE_LEFT_L = 27;
const EYE_LEFT_R = 103;

export const Character = ({ mode, className = '', size = 1 }: CharacterProps) => {
  const expression = MODE_EXPRESSIONS[mode];
  const exprRef = useRef(expression);
  exprRef.current = expression;

  const breath = useMotionValue(0);
  const blink = useMotionValue(1);

  const eyeWidthMV = useMotionValue(EYE_W);
  const eyeHeightMV = useMotionValue(EYE_H * expression.eyeScale);
  const eyeTopMV = useMotionValue(EYE_TOP + expression.eyeOffsetY);
  const eyeXMV = useMotionValue(0);
  const highlightOpacityMV = useMotionValue(1);
  const browRotateMV = useMotionValue(expression.eyebrowRotation);
  const browYMV = useMotionValue(expression.eyebrowHeight);
  const cheekOpacityMV = useMotionValue(expression.cheekOpacity);
  const headTiltMV = useMotionValue(expression.headTilt);
  const sproutRotateMV = useMotionValue(0);
  const earLeftRotateMV = useMotionValue(17);
  const earRightRotateMV = useMotionValue(-17);
  const bodyRotateMV = useMotionValue(0);

  const blinkTimeoutRef = useRef<number | null>(null);
  const smoothRef = useRef({
    eyeScale: expression.eyeScale,
    eyeOffsetY: expression.eyeOffsetY,
    browRot: expression.eyebrowRotation,
    browY: expression.eyebrowHeight,
    cheek: expression.cheekOpacity,
    tilt: expression.headTilt,
  });

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reducedMotion) {
      eyeHeightMV.set(EYE_H * expression.eyeScale);
      eyeTopMV.set(EYE_TOP + expression.eyeOffsetY);
      cheekOpacityMV.set(expression.cheekOpacity);
      browRotateMV.set(expression.eyebrowRotation);
      browYMV.set(expression.eyebrowHeight);
      headTiltMV.set(expression.headTilt);
      return;
    }

    let raf = 0;
    const k = 0.09;

    const animate = (time: number) => {
      const t = time * 0.001;
      const e = exprRef.current;
      const s = smoothRef.current;

      s.eyeScale += (e.eyeScale - s.eyeScale) * k;
      s.eyeOffsetY += (e.eyeOffsetY - s.eyeOffsetY) * k;
      s.browRot += (e.eyebrowRotation - s.browRot) * k;
      s.browY += (e.eyebrowHeight - s.browY) * k;
      s.cheek += (e.cheekOpacity - s.cheek) * k;
      s.tilt += (e.headTilt - s.tilt) * k;

      breath.set(Math.sin(t * 0.9));
      sproutRotateMV.set(Math.sin(t * 0.7) * 3);
      bodyRotateMV.set(Math.sin(t * 0.5) * 0.6 * e.bodySway);
      earLeftRotateMV.set(17 + Math.sin(t * 2.2) * 1.6);
      earRightRotateMV.set(-17 + Math.sin(t * 2.2 + 1.3) * 1.6);

      if (Math.random() < 0.003 * e.blinkSpeed) {
        blink.set(0.05);
        if (blinkTimeoutRef.current) window.clearTimeout(blinkTimeoutRef.current);
        blinkTimeoutRef.current = window.setTimeout(() => blink.set(1), 140);
      }

      const b = blink.get();
      eyeHeightMV.set(EYE_H * s.eyeScale * b);
      eyeWidthMV.set(EYE_W * (0.88 + 0.12 * b));
      eyeTopMV.set(EYE_TOP + (1 - b) * 13 + s.eyeOffsetY);
      eyeXMV.set(s.tilt * 0.25);
      highlightOpacityMV.set(Math.min(1, b * 2));
      browRotateMV.set(s.browRot);
      browYMV.set(s.browY);
      cheekOpacityMV.set(s.cheek);
      headTiltMV.set(s.tilt + Math.sin(t * 0.35) * 1.3 * e.bodySway);

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(raf);
      if (blinkTimeoutRef.current) window.clearTimeout(blinkTimeoutRef.current);
    };
  }, [reducedMotion]);

  const containerY = useTransform(breath, (v) => v * 1.6);
  const containerScaleY = useTransform(breath, (v) => 1 - v * 0.008);

  return (
    <div
      className={`sage-character ${className}`}
      style={{
        position: 'relative',
        width: BASE_W,
        height: BASE_H,
        transformOrigin: 'center bottom',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformOrigin: 'center bottom',
          transform: `scale(calc(${size} * var(--sage-char-scale, 1)))`,
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
          <ContactShadow />

          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              rotate: headTiltMV,
              transformOrigin: `${NECK.x}px ${NECK.y}px`,
            }}
          >
            <FloppyEar side="left" rotateMV={earLeftRotateMV} />
            <FloppyEar side="right" rotateMV={earRightRotateMV} />
            <CatEar side="left" />
            <CatEar side="right" />
            <Hood />
            <Face
              mouthType={expression.mouthType}
              eyeLeftL={EYE_LEFT_L}
              eyeLeftR={EYE_LEFT_R}
              eyeTopMV={eyeTopMV}
              eyeWidthMV={eyeWidthMV}
              eyeHeightMV={eyeHeightMV}
              eyeXMV={eyeXMV}
              highlightOpacityMV={highlightOpacityMV}
              browRotateMV={browRotateMV}
              browYMV={browYMV}
              cheekOpacityMV={cheekOpacityMV}
            />
            <Sprout rotateMV={sproutRotateMV} />
            <Star />
          </motion.div>

          <motion.div
            style={{
              position: 'absolute',
              top: BODY.top,
              left: BODY.left,
              width: BODY.width,
              height: BODY.height,
              background:
                'radial-gradient(ellipse at 50% 4%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 48%), linear-gradient(180deg, #C4B1E4 0%, var(--sage-hood) 42%, #A690D2 78%, var(--sage-hood-dark) 100%)',
              borderRadius: '50% 50% 42% 42% / 74% 74% 26% 26%',
              boxShadow:
                'inset 0 -16px 26px rgba(96,76,160,0.30), 0 10px 24px rgba(0,0,0,0.15)',
              transformOrigin: '50% 100%',
              rotate: bodyRotateMV,
              zIndex: 6,
            }}
          >
            <Paw side="left" />
            <Paw side="right" />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

Character.displayName = 'Character';

const ContactShadow = () => (
  <div
    style={{
      position: 'absolute',
      bottom: -8,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 278,
      height: 26,
      background:
        'radial-gradient(ellipse at center, rgba(28,18,48,0.38) 0%, rgba(28,18,48,0.16) 45%, rgba(28,18,48,0) 72%)',
      zIndex: 0,
    }}
  />
);

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
          ? 'inset -7px 2px 12px rgba(176,154,130,0.22), 0 4px 12px rgba(0,0,0,0.08)'
          : 'inset 7px 2px 12px rgba(176,154,130,0.22), 0 4px 12px rgba(0,0,0,0.08)',
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
      filter: 'drop-shadow(0 2px 3px rgba(96,76,160,0.30))',
      zIndex: 2,
    }}
  />
);

const Hood = () => (
  <div
    style={{
      position: 'absolute',
      top: HOOD.top,
      left: HOOD.left,
      width: HOOD.size,
      height: HOOD.size,
      background:
        'radial-gradient(circle at 50% 30%, var(--sage-hood-hi) 0%, var(--sage-hood) 48%, #A189CF 84%, var(--sage-hood-dark) 100%)',
      borderRadius: '50%',
      boxShadow:
        'inset 0 -14px 28px rgba(96,76,160,0.30), inset 0 10px 18px rgba(255,255,255,0.16), 0 12px 28px rgba(0,0,0,0.15)',
      zIndex: 3,
    }}
  />
);

interface FaceProps {
  mouthType: ModeExpression['mouthType'];
  eyeLeftL: number;
  eyeLeftR: number;
  eyeTopMV: MotionValue<number>;
  eyeWidthMV: MotionValue<number>;
  eyeHeightMV: MotionValue<number>;
  eyeXMV: MotionValue<number>;
  highlightOpacityMV: MotionValue<number>;
  browRotateMV: MotionValue<number>;
  browYMV: MotionValue<number>;
  cheekOpacityMV: MotionValue<number>;
}

const Face = ({
  mouthType,
  eyeLeftL,
  eyeLeftR,
  eyeTopMV,
  eyeWidthMV,
  eyeHeightMV,
  eyeXMV,
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
        'radial-gradient(circle at 42% 34%, var(--sage-face-hi) 0%, var(--sage-face) 55%, var(--sage-face-shade) 100%)',
      borderRadius: '50%',
      boxShadow:
        'inset 0 -8px 16px rgba(184,160,138,0.20), inset 0 6px 10px rgba(255,255,255,0.55), 0 4px 14px rgba(0,0,0,0.08)',
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
      highlightOpacityMV={highlightOpacityMV}
      browRotateMV={browRotateMV}
      browYMV={browYMV}
    />
    <Cheek side="left" opacityMV={cheekOpacityMV} />
    <Cheek side="right" opacityMV={cheekOpacityMV} />
    <Mouth type={mouthType} />
  </div>
);

interface EyeProps {
  side: 'left' | 'right';
  left: number;
  topMV: MotionValue<number>;
  widthMV: MotionValue<number>;
  heightMV: MotionValue<number>;
  xMV: MotionValue<number>;
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
  highlightOpacityMV,
  browRotateMV,
  browYMV,
}: EyeProps) => {
  const mirrored = side === 'right';
  return (
    <>
      <motion.div
        style={{
          position: 'absolute',
          left,
          top: topMV,
          width: widthMV,
          height: heightMV,
          x: xMV,
          background:
            'radial-gradient(circle at 34% 28%, var(--sage-eye-hi) 0%, var(--sage-eye) 52%, var(--sage-eye-deep) 100%)',
          borderRadius: '50%',
          boxShadow:
            'inset 0 -4px 8px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.10)',
          zIndex: 5,
        }}
      >
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
      </motion.div>

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

const Mouth = ({ type }: { type: ModeExpression['mouthType'] }) => {
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

  if (type === 'neutral') {
    return (
      <div
        style={{
          ...base,
          top: 126,
          width: 26,
          height: 12,
          background: 'transparent',
          borderBottom: '2.5px solid var(--sage-eye)',
          borderRadius: '0 0 50% 50% / 0 0 100% 100%',
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

  if (type === 'thinking') {
    return (
      <div
        style={{
          ...base,
          top: 126,
          width: 20,
          height: 10,
          background: 'transparent',
          borderBottom: '2px solid rgba(75,58,46,0.85)',
          borderRadius: '0 0 40% 40%',
          rotate: '-8deg',
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
      background: 'linear-gradient(180deg, var(--sage-face) 0%, var(--sage-face-shade) 100%)',
      borderRadius: '50% 50% 36% 36% / 94% 94% 10% 10%',
      boxShadow: 'inset 0 -3px 6px rgba(176,154,130,0.28)',
    }}
  />
);

const Sprout = ({
  rotateMV,
}: {
  rotateMV: MotionValue<number>;
}) => (
  <motion.div
    style={{
      position: 'absolute',
      top: 36,
      left: 150,
      x: '-50%',
      width: 7,
      height: 56,
      transformOrigin: '50% 100%',
      zIndex: 8,
      rotate: rotateMV,
    }}
  >
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 7,
        height: 44,
        background: 'linear-gradient(180deg, var(--sage-sprout) 0%, var(--sage-sprout-dark) 100%)',
        borderRadius: 4,
      }}
    />
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: -19,
        width: 32,
        height: 24,
        background:
          'radial-gradient(circle at 40% 35%, #A8F0BA 0%, var(--sage-sprout) 55%, var(--sage-sprout-dark) 100%)',
        borderRadius: '50%',
        transform: 'rotate(-36deg)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: -19,
        width: 32,
        height: 24,
        background:
          'radial-gradient(circle at 60% 35%, #A8F0BA 0%, var(--sage-sprout) 55%, var(--sage-sprout-dark) 100%)',
        borderRadius: '50%',
        transform: 'rotate(36deg)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
      }}
    />
  </motion.div>
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