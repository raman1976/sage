import { motion } from 'motion/react';
import type { HTMLMotionProps } from 'motion/react';

interface PartProps extends HTMLMotionProps<'div'> {
  className?: string;
  style?: React.CSSProperties;
}

const createPart = (defaultStyle: React.CSSProperties) => {
  const Component = ({ className, style, ...props }: PartProps) => (
    <motion.div
      className={className}
      style={{ ...defaultStyle, ...style }}
      {...props}
    />
  );
  Component.displayName = 'FacePart';
  return Component;
};

export const EyeLeft = createPart({
  position: 'absolute',
  top: '55px',
  left: '45px',
  width: '42px',
  height: '52px',
  background: 'radial-gradient(ellipse at 30% 30%, var(--color-brown-light) 0%, var(--color-brown) 60%, #1a1008 100%)',
  borderRadius: '50% 50% 45% 45% / 55% 55% 45% 45%',
  boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.2), inset 2px 2px 4px rgba(255,255,255,0.1)',
  zIndex: 5,
});

export const EyeRight = createPart({
  position: 'absolute',
  top: '55px',
  right: '45px',
  width: '42px',
  height: '52px',
  background: 'radial-gradient(ellipse at 30% 30%, var(--color-brown-light) 0%, var(--color-brown) 60%, #1a1008 100%)',
  borderRadius: '50% 50% 45% 45% / 55% 55% 45% 45%',
  boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.2), inset -2px 2px 4px rgba(255,255,255,0.1)',
  zIndex: 5,
});

export const EyeHighlightLeft = createPart({
  position: 'absolute',
  top: '12px',
  left: '10px',
  width: '14px',
  height: '14px',
  background: 'var(--color-white)',
  borderRadius: '50%',
  filter: 'blur(1px)',
  opacity: 0.9,
  zIndex: 6,
});

export const EyeHighlightRight = createPart({
  position: 'absolute',
  top: '12px',
  left: '10px',
  width: '14px',
  height: '14px',
  background: 'var(--color-white)',
  borderRadius: '50%',
  filter: 'blur(1px)',
  opacity: 0.9,
  zIndex: 6,
});

export const EyeHighlightSmallLeft = createPart({
  position: 'absolute',
  top: '28px',
  left: '26px',
  width: '6px',
  height: '6px',
  background: 'var(--color-white)',
  borderRadius: '50%',
  opacity: 0.6,
  zIndex: 6,
});

export const EyeHighlightSmallRight = createPart({
  position: 'absolute',
  top: '28px',
  left: '26px',
  width: '6px',
  height: '6px',
  background: 'var(--color-white)',
  borderRadius: '50%',
  opacity: 0.6,
  zIndex: 6,
});

export const EyebrowLeft = createPart({
  position: 'absolute',
  top: '35px',
  left: '38px',
  width: '48px',
  height: '8px',
  background: 'transparent',
  borderTop: '3px solid var(--color-brown)',
  borderRadius: '50% 50% 0 0',
  transform: 'rotate(-8deg)',
  zIndex: 4,
});

export const EyebrowRight = createPart({
  position: 'absolute',
  top: '35px',
  right: '38px',
  width: '48px',
  height: '8px',
  background: 'transparent',
  borderTop: '3px solid var(--color-brown)',
  borderRadius: '50% 50% 0 0',
  transform: 'rotate(8deg)',
  zIndex: 4,
});

export const CheekLeft = createPart({
  position: 'absolute',
  top: '100px',
  left: '15px',
  width: '36px',
  height: '24px',
  background: 'radial-gradient(ellipse at center, var(--color-pink) 0%, transparent 70%)',
  borderRadius: '50%',
  opacity: 0.6,
  filter: 'blur(4px)',
  zIndex: 3,
});

export const CheekRight = createPart({
  position: 'absolute',
  top: '100px',
  right: '15px',
  width: '36px',
  height: '24px',
  background: 'radial-gradient(ellipse at center, var(--color-pink) 0%, transparent 70%)',
  borderRadius: '50%',
  opacity: 0.6,
  filter: 'blur(4px)',
  zIndex: 3,
});

export const Mouth = createPart({
  position: 'absolute',
  top: '115px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '36px',
  height: '20px',
  background: 'transparent',
  borderBottom: '3px solid var(--color-brown)',
  borderRadius: '0 0 50% 50% / 0 0 80% 80%',
  zIndex: 5,
});

export const MouthOpen = createPart({
  position: 'absolute',
  top: '115px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '40px',
  height: '28px',
  background: 'radial-gradient(ellipse at center, var(--color-pink-dark) 0%, var(--color-pink) 100%)',
  borderRadius: '50% 50% 40% 40%',
  zIndex: 4,
});

export const Tongue = createPart({
  position: 'absolute',
  top: '10px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '20px',
  height: '16px',
  background: 'radial-gradient(ellipse at center, #ff8fa3 0%, #ff6b8a 100%)',
  borderRadius: '0 0 50% 50%',
  zIndex: 5,
});

export const MouthSmile = createPart({
  position: 'absolute',
  top: '115px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '44px',
  height: '22px',
  background: 'transparent',
  borderBottom: '3px solid var(--color-brown)',
  borderRadius: '0 0 60% 60% / 0 0 90% 90%',
  zIndex: 5,
});

export const MouthThinking = createPart({
  position: 'absolute',
  top: '118px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '28px',
  height: '12px',
  background: 'transparent',
  borderBottom: '2px solid var(--color-brown)',
  borderRadius: '0 0 30% 30%',
  zIndex: 5,
});

export const MouthCalm = createPart({
  position: 'absolute',
  top: '118px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '32px',
  height: '16px',
  background: 'transparent',
  borderBottom: '2px solid var(--color-brown)',
  borderRadius: '0 0 40% 40% / 0 0 60% 60%',
  opacity: 0.7,
  zIndex: 5,
});