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
  Component.displayName = 'CharacterPart';
  return Component;
};

export const Body = createPart({
  position: 'absolute',
  bottom: '0',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '180px',
  height: '140px',
  background: 'radial-gradient(ellipse at center, var(--color-cream) 0%, var(--color-cream-dark) 100%)',
  borderRadius: '90px 90px 40px 40px',
  boxShadow: 'inset 0 -10px 20px rgba(0,0,0,0.05), 0 4px 12px var(--shadow-color)',
  zIndex: 1,
});

export const Head = createPart({
  position: 'absolute',
  bottom: '120px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '200px',
  height: '190px',
  background: 'radial-gradient(ellipse at center, var(--color-cream) 0%, var(--color-cream-dark) 100%)',
  borderRadius: '50% 50% 45% 45%',
  boxShadow: '0 8px 24px var(--shadow-color)',
  zIndex: 2,
});

export const EarLeft = createPart({
  position: 'absolute',
  top: '20px',
  left: '-30px',
  width: '50px',
  height: '100px',
  background: 'radial-gradient(ellipse at center, var(--color-cream) 0%, var(--color-cream-dark) 100%)',
  borderRadius: '50% 50% 30% 30% / 60% 60% 40% 40%',
  transform: 'rotate(-15deg)',
  boxShadow: 'inset -5px 0 10px rgba(0,0,0,0.05)',
  zIndex: 0,
});

export const EarRight = createPart({
  position: 'absolute',
  top: '20px',
  right: '-30px',
  width: '50px',
  height: '100px',
  background: 'radial-gradient(ellipse at center, var(--color-cream) 0%, var(--color-cream-dark) 100%)',
  borderRadius: '50% 50% 30% 30% / 60% 60% 40% 40%',
  transform: 'rotate(15deg)',
  boxShadow: 'inset 5px 0 10px rgba(0,0,0,0.05)',
  zIndex: 0,
});

export const Hoodie = createPart({
  position: 'absolute',
  bottom: '0',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '220px',
  height: '200px',
  background: 'linear-gradient(180deg, var(--color-lavender) 0%, var(--color-lavender-dark) 100%)',
  borderRadius: '0 0 60px 60px',
  boxShadow: '0 4px 16px rgba(168, 148, 209, 0.3)',
  zIndex: 3,
});

export const Hood = createPart({
  position: 'absolute',
  top: '-80px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '210px',
  height: '130px',
  background: 'linear-gradient(180deg, var(--color-lavender) 0%, var(--color-lavender-dark) 100%)',
  borderRadius: '60% 60% 0 0 / 80% 80% 0 0',
  zIndex: 4,
});

export const CatEarLeft = createPart({
  position: 'absolute',
  top: '-40px',
  left: '20px',
  width: '0',
  height: '0',
  borderLeft: '25px solid transparent',
  borderRight: '25px solid transparent',
  borderBottom: '50px solid var(--color-lavender-dark)',
  transform: 'rotate(-10deg)',
  zIndex: 3,
});

export const CatEarRight = createPart({
  position: 'absolute',
  top: '-40px',
  right: '20px',
  width: '0',
  height: '0',
  borderLeft: '25px solid transparent',
  borderRight: '25px solid transparent',
  borderBottom: '50px solid var(--color-lavender-dark)',
  transform: 'rotate(10deg)',
  zIndex: 3,
});

export const HoodPocket = createPart({
  position: 'absolute',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '80px',
  height: '50px',
  background: 'rgba(255,255,255,0.15)',
  borderRadius: '0 0 40px 40px',
  border: '2px dashed rgba(255,255,255,0.3)',
  zIndex: 4,
});

export const Star = createPart({
  position: 'absolute',
  top: '-50px',
  right: '10px',
  width: '28px',
  height: '28px',
  background: 'linear-gradient(135deg, var(--color-yellow) 0%, var(--color-yellow-dark) 100%)',
  clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
  filter: 'drop-shadow(0 2px 4px rgba(255,224,102,0.4))',
  zIndex: 5,
});

export const Sprout = createPart({
  position: 'absolute',
  top: '-95px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '12px',
  height: '40px',
  zIndex: 5,
});

export const SproutStem = createPart({
  position: 'absolute',
  bottom: '0',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '6px',
  height: '30px',
  background: 'linear-gradient(180deg, var(--color-green) 0%, var(--color-green-dark) 100%)',
  borderRadius: '3px',
  zIndex: 1,
});

export const SproutLeafLeft = createPart({
  position: 'absolute',
  top: '8px',
  left: '-12px',
  width: '0',
  height: '0',
  borderLeft: '14px solid transparent',
  borderRight: '14px solid transparent',
  borderBottom: '20px solid var(--color-green)',
  transform: 'rotate(-30deg)',
  borderRadius: '0 0 50% 0',
  zIndex: 2,
});

export const SproutLeafRight = createPart({
  position: 'absolute',
  top: '8px',
  right: '-12px',
  width: '0',
  height: '0',
  borderLeft: '14px solid transparent',
  borderRight: '14px solid transparent',
  borderBottom: '20px solid var(--color-green)',
  transform: 'rotate(30deg)',
  borderRadius: '0 0 0 50%',
  zIndex: 2,
});

export const PawLeft = createPart({
  position: 'absolute',
  bottom: '10px',
  left: '50px',
  width: '40px',
  height: '25px',
  background: 'var(--color-cream)',
  borderRadius: '50% / 100% 100% 0 0',
  boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.05)',
  zIndex: 2,
});

export const PawRight = createPart({
  position: 'absolute',
  bottom: '10px',
  right: '50px',
  width: '40px',
  height: '25px',
  background: 'var(--color-cream)',
  borderRadius: '50% / 100% 100% 0 0',
  boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.05)',
  zIndex: 2,
});

export const DrawstringLeft = createPart({
  position: 'absolute',
  top: '60px',
  left: '40px',
  width: '8px',
  height: '30px',
  background: 'linear-gradient(180deg, var(--color-cream) 0%, var(--color-cream-dark) 100%)',
  borderRadius: '4px',
  transform: 'rotate(-5deg)',
  zIndex: 4,
});

export const DrawstringRight = createPart({
  position: 'absolute',
  top: '60px',
  right: '40px',
  width: '8px',
  height: '30px',
  background: 'linear-gradient(180deg, var(--color-cream) 0%, var(--color-cream-dark) 100%)',
  borderRadius: '4px',
  transform: 'rotate(5deg)',
  zIndex: 4,
});