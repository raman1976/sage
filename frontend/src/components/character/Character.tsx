import { motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useRef } from 'react';
import type { SageMode } from '../../types';

interface CharacterProps {
  mode: SageMode;
  className?: string;
  size?: number;
}

const MODE_EXPRESSIONS: Record<SageMode, {
  eyeScale: number;
  eyeOffsetY: number;
  eyebrowRotation: number;
  eyebrowHeight: number;
  mouthType: 'smile' | 'open' | 'thinking' | 'calm' | 'neutral';
  cheekOpacity: number;
  headTilt: number;
  bodySway: number;
  blinkSpeed: number;
}> = {
  idle: { eyeScale: 1, eyeOffsetY: 0, eyebrowRotation: -8, eyebrowHeight: 0, mouthType: 'smile', cheekOpacity: 0.6, headTilt: 0, bodySway: 1, blinkSpeed: 1 },
  start: { eyeScale: 1.1, eyeOffsetY: -2, eyebrowRotation: -15, eyebrowHeight: -5, mouthType: 'open', cheekOpacity: 0.8, headTilt: 0, bodySway: 1.5, blinkSpeed: 0.8 },
  focus: { eyeScale: 0.95, eyeOffsetY: 0, eyebrowRotation: -2, eyebrowHeight: 2, mouthType: 'neutral', cheekOpacity: 0.4, headTilt: 0, bodySway: 0.3, blinkSpeed: 1.2 },
  calm: { eyeScale: 0.5, eyeOffsetY: 2, eyebrowRotation: -5, eyebrowHeight: 0, mouthType: 'calm', cheekOpacity: 0.5, headTilt: 0, bodySway: 0.5, blinkSpeed: 0.5 },
  plan: { eyeScale: 0.9, eyeOffsetY: -4, eyebrowRotation: 5, eyebrowHeight: -3, mouthType: 'thinking', cheekOpacity: 0.4, headTilt: 5, bodySway: 0.8, blinkSpeed: 1 },
  listening: { eyeScale: 1.15, eyeOffsetY: -1, eyebrowRotation: -12, eyebrowHeight: -4, mouthType: 'neutral', cheekOpacity: 0.5, headTilt: -3, bodySway: 0.6, blinkSpeed: 0.9 },
  thinking: { eyeScale: 0.9, eyeOffsetY: -6, eyebrowRotation: 8, eyebrowHeight: -5, mouthType: 'thinking', cheekOpacity: 0.3, headTilt: 3, bodySway: 0.7, blinkSpeed: 1.5 },
};

const CHARACTER_WIDTH = 300;
const CHARACTER_HEIGHT = 380;
const BODY_HEIGHT = 180;
const FACE_WIDTH = 220;
const FACE_HEIGHT = 220;
const FACE_TOP = 10;

export const Character = ({ mode, className = '', size = 1 }: CharacterProps) => {
  const timeRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  const breath = useMotionValue(0);
  const blink = useMotionValue(1);
  const headTilt = useMotionValue(0);
  const sproutSway = useMotionValue(0);
  const earTwitch = useMotionValue(0);
  const bodySway = useMotionValue(0);

  const expression = MODE_EXPRESSIONS[mode];

  const eyeOffsetY = useMotionValue(expression.eyeOffsetY);
  const eyebrowRotation = useMotionValue(expression.eyebrowRotation);
  const eyebrowHeight = useMotionValue(expression.eyebrowHeight);
  const cheekOpacity = useMotionValue(expression.cheekOpacity);
  const targetHeadTilt = useMotionValue(expression.headTilt);

  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reducedMotion) return;

    const animate = (time: number) => {
      timeRef.current = time;
      const t = time * 0.001;

      breath.set(Math.sin(t * 0.8) * 0.02);
      bodySway.set(Math.sin(t * 0.5) * 0.5 * expression.bodySway);
      sproutSway.set(Math.sin(t * 0.7) * 3);
      earTwitch.set(Math.sin(t * 2.3) * 1.5);

      if (Math.random() < 0.003 * expression.blinkSpeed) {
        blink.set(0);
        setTimeout(() => blink.set(1), 150);
      }

      headTilt.set(targetHeadTilt.get() + Math.sin(t * 0.3) * 1.5 * expression.bodySway);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [mode, expression.bodySway, expression.blinkSpeed, reducedMotion, targetHeadTilt]);

  const eyeHeight = useTransform(blink, (b) => 52 * b);
  const eyeWidth = useTransform(blink, (b) => 42 * (b * 0.1 + 0.9));
  const eyeTop = useTransform(blink, (b) => FACE_TOP + 40 + (1 - b) * 15);

  const pupilOffsetX = useTransform(headTilt, (t) => t * 0.8);
  const pupilOffsetY = useTransform(eyeOffsetY, (y) => y);

  const mouthWidth = useTransform(blink, (b) => expression.mouthType === 'open' ? 40 + (1 - b) * 10 : 36);
  const mouthHeight = useTransform(blink, (b) => expression.mouthType === 'open' ? 28 + (1 - b) * 8 : 20);

  const earLeftRotate = useTransform(earTwitch, (e) => -20 + (e > 0 ? e : 0));
  const earRightRotate = useTransform(earTwitch, (e) => 20 + (e < 0 ? e : 0));
  const bodyRotate = useTransform(bodySway, (s) => s * 0.3);
  const headRotate = useTransform(headTilt, (t) => t * 0.4);
  const sproutRotate = useTransform(sproutSway, (s) => s);
  const highlightOpacity = useTransform(blink, (b) => b);
  const highlightX = useTransform(pupilOffsetX, (x) => x * 0.5);
  const highlightY = useTransform(pupilOffsetY, (y) => y * 0.5);
  const browRotate = useTransform(eyebrowRotation, (r) => r);
  const browY = useTransform(eyebrowHeight, (y) => y);
  const containerRotate = useTransform(headTilt, (t) => t);
  const containerY = useTransform(breath, (b) => b * 4);
  const containerScaleY = useTransform(breath, (b) => 1 - b * 0.02);

  return (
    <motion.div
      className={`sage-character ${className}`}
      style={{
        position: 'relative',
        width: CHARACTER_WIDTH * size,
        height: CHARACTER_HEIGHT * size,
        transformOrigin: 'center bottom',
        transform: `scale(${size})`,
        rotate: containerRotate,
      }}
    >
      <motion.div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: CHARACTER_WIDTH,
          height: CHARACTER_HEIGHT,
          transformOrigin: 'center bottom',
          y: containerY,
          scaleY: containerScaleY,
        }}
      >
        <BodyAndHoodie 
          rotate={bodyRotate} 
          width={CHARACTER_WIDTH} 
          height={BODY_HEIGHT}
        />
        
        <Head 
          rotate={headRotate}
          width={CHARACTER_WIDTH}
          faceTop={FACE_TOP}
          faceWidth={FACE_WIDTH}
          faceHeight={FACE_HEIGHT}
          eyeWidth={eyeWidth}
          eyeHeight={eyeHeight}
          eyeTop={eyeTop}
          pupilOffsetX={pupilOffsetX}
          pupilOffsetY={pupilOffsetY}
          highlightOpacity={highlightOpacity}
          highlightX={highlightX}
          highlightY={highlightY}
          browRotate={browRotate}
          browY={browY}
          cheekOpacity={cheekOpacity}
          mouthType={expression.mouthType}
          mouthWidth={mouthWidth}
          mouthHeight={mouthHeight}
          earLeftRotate={earLeftRotate}
          earRightRotate={earRightRotate}
          sproutRotate={sproutRotate}
        />
      </motion.div>
    </motion.div>
  );
};

Character.displayName = 'Character';

const BodyAndHoodie = ({ rotate, width, height }: { 
  rotate: any; 
  width: number; 
  height: number; 
}) => (
  <motion.div
    style={{
      position: 'absolute',
      bottom: 0,
      left: '50%',
      transform: `translateX(-50%)`,
      width,
      height,
      background: 'linear-gradient(180deg, var(--color-lavender) 0%, var(--color-lavender-dark) 100%)',
      borderRadius: `${width / 2}px ${width / 2}px 40px 40px`,
      boxShadow: 'inset 0 -10px 20px rgba(0,0,0,0.05), 0 4px 12px var(--shadow-color)',
      zIndex: 1,
      transformOrigin: 'center bottom',
    }}
    animate={{ rotate }}
  >
    <div style={{
      position: 'absolute',
      bottom: 12,
      left: width * 0.18,
      width: width * 0.12,
      height: 22,
      background: 'var(--color-cream)',
      borderRadius: '50% / 100% 100% 0 0',
      boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.05)',
    }} />
    <div style={{
      position: 'absolute',
      bottom: 12,
      right: width * 0.18,
      width: width * 0.12,
      height: 22,
      background: 'var(--color-cream)',
      borderRadius: '50% / 100% 100% 0 0',
      boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.05)',
    }} />
  </motion.div>
);

const Head = ({ 
  rotate,
  width,
  faceTop,
  faceWidth,
  faceHeight,
  eyeWidth,
  eyeHeight,
  eyeTop,
  pupilOffsetX,
  pupilOffsetY,
  highlightOpacity,
  highlightX,
  highlightY,
  browRotate,
  browY,
  cheekOpacity,
  mouthType,
  mouthWidth,
  mouthHeight,
  earLeftRotate,
  earRightRotate,
  sproutRotate,
}: any) => (
  <motion.div
    style={{
      position: 'absolute',
      bottom: BODY_HEIGHT - 40,
      left: '50%',
      transform: 'translateX(-50%)',
      width,
      height: 260,
      transformOrigin: 'center bottom',
    }}
    animate={{ rotate }}
  >
    <Ear 
      side="left" 
      rotate={earLeftRotate} 
      top={40} 
      left={10} 
      width={55} 
      height={110} 
    />
    <Ear 
      side="right" 
      rotate={earRightRotate} 
      top={40} 
      right={10} 
      width={55} 
      height={110} 
    />

    <HoodFrame
      top={faceTop - 20}
      left="50%"
      width={faceWidth + 40}
      height={faceHeight + 60}
    />

    <Face
      top={faceTop}
      left="50%"
      width={faceWidth}
      height={faceHeight}
      eyeWidth={eyeWidth}
      eyeHeight={eyeHeight}
      eyeTop={eyeTop}
      pupilOffsetX={pupilOffsetX}
      pupilOffsetY={pupilOffsetY}
      highlightOpacity={highlightOpacity}
      highlightX={highlightX}
      highlightY={highlightY}
      browRotate={browRotate}
      browY={browY}
      cheekOpacity={cheekOpacity}
      mouthType={mouthType}
      mouthWidth={mouthWidth}
      mouthHeight={mouthHeight}
    />

    <CatEar side="left" top={-30} left={35} />
    <CatEar side="right" top={-30} right={35} />

    <Star top={-40} right={20} />

    <Sprout top={-85} left="50%" rotate={sproutRotate} />
  </motion.div>
);

const Ear = ({ 
  side, 
  rotate, 
  top, 
  left, 
  right, 
  width, 
  height 
}: { 
  side: 'left' | 'right';
  rotate: any;
  top: number;
  left?: number;
  right?: number;
  width: number;
  height: number;
}) => (
  <motion.div
    style={{
      position: 'absolute',
      top,
      [side]: side === 'left' ? left! : undefined,
      right: side === 'right' ? right! : undefined,
      width,
      height,
      background: 'radial-gradient(ellipse at center, var(--color-cream) 0%, var(--color-cream-dark) 100%)',
      borderRadius: '50% 50% 30% 30% / 60% 60% 40% 40%',
      transformOrigin: 'bottom center',
      boxShadow: `inset ${side === 'left' ? '-' : ''}5px 0 10px rgba(0,0,0,0.05)`,
      zIndex: 0,
    }}
    animate={{ rotate }}
  />
);

const HoodFrame = ({ 
  top, 
  left, 
  width, 
  height 
}: { 
  top: number;
  left: string;
  width: number;
  height: number;
}) => (
  <div
    style={{
      position: 'absolute',
      top,
      left,
      transform: 'translateX(-50%)',
      width,
      height,
      background: 'linear-gradient(180deg, var(--color-lavender) 0%, var(--color-lavender-dark) 100%)',
      borderRadius: '50% 50% 40% 40% / 60% 60% 40% 40%',
      boxShadow: 'inset 0 0 20px rgba(168, 148, 209, 0.3), 0 8px 24px var(--shadow-color)',
      zIndex: 2,
    }}
  >
    <div style={{
      position: 'absolute',
      bottom: 40,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 80,
      height: 45,
      background: 'rgba(255,255,255,0.12)',
      borderRadius: '0 0 40px 40px',
      border: '2px dashed rgba(255,255,255,0.25)',
    }} />
    <div style={{
      position: 'absolute',
      top: 55,
      left: 30,
      width: 7,
      height: 28,
      background: 'linear-gradient(180deg, var(--color-cream) 0%, var(--color-cream-dark) 100%)',
      borderRadius: '4px',
      transform: 'rotate(-8deg)',
    }} />
    <div style={{
      position: 'absolute',
      top: 55,
      right: 30,
      width: 7,
      height: 28,
      background: 'linear-gradient(180deg, var(--color-cream) 0%, var(--color-cream-dark) 100%)',
      borderRadius: '4px',
      transform: 'rotate(8deg)',
    }} />
  </div>
);

const Face = ({
  top,
  left,
  width,
  height,
  eyeWidth,
  eyeHeight,
  eyeTop,
  pupilOffsetX,
  pupilOffsetY,
  highlightOpacity,
  highlightX,
  highlightY,
  browRotate,
  browY,
  cheekOpacity,
  mouthType,
  mouthWidth,
  mouthHeight,
}: any) => (
  <div
    style={{
      position: 'absolute',
      top,
      left,
      transform: 'translateX(-50%)',
      width,
      height,
      background: 'radial-gradient(ellipse at center, var(--color-cream) 0%, var(--color-cream-dark) 100%)',
      borderRadius: '50% 50% 45% 45%',
      boxShadow: 'inset 0 4px 12px rgba(168, 148, 209, 0.15), 0 4px 16px var(--shadow-color)',
      zIndex: 3,
    }}
  >
    <Eye 
      side="left"
      top={45}
      left={50}
      width={eyeWidth}
      height={eyeHeight}
      topPos={eyeTop}
      pupilOffsetX={pupilOffsetX}
      pupilOffsetY={pupilOffsetY}
      highlightOpacity={highlightOpacity}
      highlightX={highlightX}
      highlightY={highlightY}
      browRotate={browRotate}
      browY={browY}
    />
    <Eye 
      side="right"
      top={45}
      right={50}
      width={eyeWidth}
      height={eyeHeight}
      topPos={eyeTop}
      pupilOffsetX={pupilOffsetX}
      pupilOffsetY={pupilOffsetY}
      highlightOpacity={highlightOpacity}
      highlightX={highlightX}
      highlightY={highlightY}
      browRotate={browRotate}
      browY={browY}
    />

    <Cheek side="left" top={105} left={20} opacity={cheekOpacity} />
    <Cheek side="right" top={105} right={20} opacity={cheekOpacity} />

    <Mouth 
      type={mouthType}
      top={120}
      left="50%"
      width={mouthWidth}
      height={mouthHeight}
    />
  </div>
);

const Eye = ({
  side,
  top,
  left,
  right,
  width,
  height,
  topPos,
  pupilOffsetX,
  pupilOffsetY,
  highlightOpacity,
  highlightX,
  highlightY,
  browRotate,
  browY,
}: any) => (
  <>
    <motion.div
      style={{
        position: 'absolute',
        top,
        [side]: side === 'left' ? left! : undefined,
        right: side === 'right' ? right! : undefined,
        width,
        height,
        background: 'radial-gradient(ellipse at 30% 30%, var(--color-brown-light) 0%, var(--color-brown) 60%, #1a1008 100%)',
        borderRadius: '50% 50% 45% 45% / 55% 55% 45% 45%',
        boxShadow: `inset 0 -3px 6px rgba(0,0,0,0.2), inset ${side === 'left' ? '2px' : '-2px'} 2px 4px rgba(255,255,255,0.1)`,
        zIndex: 5,
        transformOrigin: 'center center',
      }}
      animate={{ 
        top: topPos,
        translateX: pupilOffsetX,
        translateY: pupilOffsetY,
      }}
    >
      <motion.div
        style={{
          position: 'absolute',
          top: 12,
          left: 10,
          width: 14,
          height: 14,
          background: 'var(--color-white)',
          borderRadius: '50%',
          filter: 'blur(1px)',
          zIndex: 6,
        }}
        animate={{ 
          opacity: highlightOpacity,
          translateX: highlightX,
          translateY: highlightY,
        }}
      />
      <motion.div
        style={{
          position: 'absolute',
          top: 28,
          left: 26,
          width: 6,
          height: 6,
          background: 'var(--color-white)',
          borderRadius: '50%',
          zIndex: 6,
        }}
        animate={{ 
          opacity: highlightOpacity,
          translateX: highlightX,
          translateY: highlightY,
        }}
      />
    </motion.div>

    <motion.div
      style={{
        position: 'absolute',
        top: 25,
        [side]: side === 'left' ? 40 : undefined,
        right: side === 'right' ? 40 : undefined,
        width: 48,
        height: 8,
        background: 'transparent',
        borderTop: '3px solid var(--color-brown)',
        borderRadius: '50% 50% 0 0',
        transformOrigin: 'center center',
        zIndex: 4,
      }}
      animate={{ 
        rotate: browRotate,
        y: browY,
      }}
    />
  </>
);

const Cheek = ({ 
  side, 
  top, 
  left, 
  right, 
  opacity 
}: { 
  side: 'left' | 'right';
  top: number;
  left?: number;
  right?: number;
  opacity: any;
}) => (
  <motion.div
    style={{
      position: 'absolute',
      top,
      [side]: side === 'left' ? left! : undefined,
      right: side === 'right' ? right! : undefined,
      width: 36,
      height: 24,
      background: 'radial-gradient(ellipse at center, var(--color-pink) 0%, transparent 70%)',
      borderRadius: '50%',
      filter: 'blur(4px)',
      zIndex: 3,
    }}
    animate={{ opacity }}
  />
);

const Mouth = ({ 
  type, 
  top, 
  left, 
  width, 
  height 
}: { 
  type: string;
  top: number;
  left: string;
  width: any;
  height: any;
}) => {
  if (type === 'open') {
    return (
      <motion.div
        style={{
          position: 'absolute',
          top,
          left,
          transform: 'translateX(-50%)',
          width,
          height,
          background: 'radial-gradient(ellipse at center, var(--color-pink-dark) 0%, var(--color-pink) 100%)',
          borderRadius: '50% 50% 40% 40%',
          zIndex: 4,
        }}
      >
        <div style={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 20,
          height: 16,
          background: 'radial-gradient(ellipse at center, #ff8fa3 0%, #ff6b8a 100%)',
          borderRadius: '0 0 50% 50%',
          zIndex: 5,
        }} />
      </motion.div>
    );
  }
  if (type === 'smile') {
    return (
      <motion.div
        style={{
          position: 'absolute',
          top,
          left,
          transform: 'translateX(-50%)',
          width,
          height: 22,
          background: 'transparent',
          borderBottom: '3px solid var(--color-brown)',
          borderRadius: '0 0 60% 60% / 0 0 90% 90%',
          zIndex: 5,
        }}
      />
    );
  }
  if (type === 'thinking') {
    return (
      <div
        style={{
          position: 'absolute',
          top: top + 3,
          left,
          transform: 'translateX(-50%)',
          width: 28,
          height: 12,
          background: 'transparent',
          borderBottom: '2px solid var(--color-brown)',
          borderRadius: '0 0 30% 30%',
          zIndex: 5,
        }}
      />
    );
  }
  if (type === 'calm') {
    return (
      <div
        style={{
          position: 'absolute',
          top: top + 3,
          left,
          transform: 'translateX(-50%)',
          width: 32,
          height: 16,
          background: 'transparent',
          borderBottom: '2px solid var(--color-brown)',
          borderRadius: '0 0 40% 40% / 0 0 60% 60%',
          opacity: 0.7,
          zIndex: 5,
        }}
      />
    );
  }
  return (
    <motion.div
      style={{
        position: 'absolute',
        top,
        left,
        transform: 'translateX(-50%)',
        width,
        height: 20,
        background: 'transparent',
        borderBottom: '3px solid var(--color-brown)',
        borderRadius: '0 0 50% 50% / 0 0 80% 80%',
        zIndex: 5,
      }}
    />
  );
};

const CatEar = ({ 
  side, 
  top, 
  left, 
  right 
}: { 
  side: 'left' | 'right';
  top: number;
  left?: number;
  right?: number;
}) => (
  <div
    style={{
      position: 'absolute',
      top,
      [side]: side === 'left' ? left! : undefined,
      right: side === 'right' ? right! : undefined,
      width: 0,
      height: 0,
      borderLeft: '25px solid transparent',
      borderRight: '25px solid transparent',
      borderBottom: '50px solid var(--color-lavender-dark)',
      transform: side === 'left' ? 'rotate(-10deg)' : 'rotate(10deg)',
      zIndex: 4,
    }}
  />
);

const Star = ({ 
  top, 
  right 
}: { 
  top: number;
  right: number;
}) => (
  <div
    style={{
      position: 'absolute',
      top,
      right,
      width: 28,
      height: 28,
      background: 'linear-gradient(135deg, var(--color-yellow) 0%, var(--color-yellow-dark) 100%)',
      clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
      filter: 'drop-shadow(0 2px 4px rgba(255,224,102,0.4))',
      zIndex: 5,
    }}
  />
);

const Sprout = ({ 
  top, 
  left, 
  rotate 
}: { 
  top: number;
  left: string;
  rotate: any;
}) => (
  <motion.div
    style={{
      position: 'absolute',
      top,
      left,
      transform: 'translateX(-50%)',
      width: 12,
      height: 40,
      transformOrigin: 'bottom center',
      zIndex: 5,
    }}
    animate={{ rotate }}
  >
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 6,
      height: 30,
      background: 'linear-gradient(180deg, var(--color-green) 0%, var(--color-green-dark) 100%)',
      borderRadius: '3px',
    }} />
    <div style={{
      position: 'absolute',
      top: 8,
      left: -12,
      width: 0,
      height: 0,
      borderLeft: '14px solid transparent',
      borderRight: '14px solid transparent',
      borderBottom: '20px solid var(--color-green)',
      transform: 'rotate(-30deg)',
      borderRadius: '0 0 50% 0',
    }} />
    <div style={{
      position: 'absolute',
      top: 8,
      right: -12,
      width: 0,
      height: 0,
      borderLeft: '14px solid transparent',
      borderRight: '14px solid transparent',
      borderBottom: '20px solid var(--color-green)',
      transform: 'rotate(30deg)',
      borderRadius: '0 0 0 50%',
    }} />
  </motion.div>
);