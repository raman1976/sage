import { useEffect, useRef, useState } from 'react';
import './FireflyCursor.css';

interface FireflyCursorProps {
  /** Glow color, matched to the selected avatar. */
  color: string;
}

const SELECTOR =
  'a, button, input, textarea, select, [role="button"], [role="link"], [data-clickable], label, summary, [contenteditable="true"]';

const SIZE = 30;
const HALF = SIZE / 2;

const isTouchDevice = () => {
  if (typeof window === 'undefined') return true;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return !fine || reduced;
};

const isTextTarget = (el: Element | null) =>
  !!el &&
  (el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    (el as HTMLElement).isContentEditable);

export const FireflyCursor = ({ color }: FireflyCursorProps) => {
  const [enabled, setEnabled] = useState(false);

  const layerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<HTMLDivElement>(null);
  const idleRef = useRef<HTMLDivElement>(null);

  const colorRef = useRef(color);
  colorRef.current = color;

  // Enable only on desktop with a fine pointer and no reduced-motion request.
  useEffect(() => {
    setEnabled(!isTouchDevice());
  }, []);

  // Swap out the native cursor only while the firefly is active.
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.classList.add('sage-firefly-active');
    return () => root.classList.remove('sage-firefly-active');
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const layer = layerRef.current;
    const pos = posRef.current;
    const hover = hoverRef.current;
    const idle = idleRef.current;
    if (!layer || !pos || !hover || !idle) return;

    let targetX = window.innerWidth * 0.5;
    let targetY = window.innerHeight * 0.5;
    let x = targetX;
    let y = targetY;
    let prevX = x;
    let prevY = y;
    let hovering = false;
    let hidden = false;
    let lastMove = performance.now();
    let lastTrail = 0;
    let raf = 0;

    const setHover = (value: boolean) => {
      if (hovering === value) return;
      hovering = value;
      hover.classList.toggle('is-hover', value);
    };
    const setIdle = (value: boolean) => idle.classList.toggle('is-idle', value);
    const setHidden = (value: boolean) => {
      if (hidden === value) return;
      hidden = value;
      pos.classList.toggle('is-hidden', value);
    };

    const cap = () => {
      while (layer.children.length > 44) layer.firstElementChild?.remove();
    };

    const spawnTrail = (cx: number, cy: number) => {
      const s = document.createElement('div');
      s.className = 'ff-spark';
      const size = 2.5 + Math.random() * 3.5;
      s.style.left = `${cx + (Math.random() * 12 - 6)}px`;
      s.style.top = `${cy + (Math.random() * 12 - 6)}px`;
      s.style.width = `${size}px`;
      s.style.height = `${size}px`;
      s.style.animationDuration = `${480 + Math.random() * 320}ms`;
      s.style.setProperty('--ff-color', colorRef.current);
      s.addEventListener('animationend', () => s.remove());
      layer.appendChild(s);
      cap();
    };

    const burst = (cx: number, cy: number) => {
      const count = 9;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const dist = 16 + Math.random() * 18;
        const s = document.createElement('div');
        s.className = 'ff-burst';
        const size = 3 + Math.random() * 3;
        s.style.left = `${cx}px`;
        s.style.top = `${cy}px`;
        s.style.width = `${size}px`;
        s.style.height = `${size}px`;
        s.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
        s.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
        s.style.animationDuration = `${520 + Math.random() * 260}ms`;
        s.style.setProperty('--ff-color', colorRef.current);
        s.addEventListener('animationend', () => s.remove());
        layer.appendChild(s);
      }
      cap();
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      targetX = event.clientX;
      targetY = event.clientY;
      lastMove = performance.now();
      const el = document.elementFromPoint(event.clientX, event.clientY);
      setHidden(isTextTarget(el));
      setHover(!isTextTarget(el) && !!el?.closest(SELECTOR));
    };

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      burst(event.clientX, event.clientY);
    };

    const onBlur = () => setHidden(true);

    const loop = (now: number) => {
      x += (targetX - x) * 0.22;
      y += (targetY - y) * 0.22;
      pos.style.transform = `translate3d(${x - HALF}px, ${y - HALF}px, 0)`;

      const dist = Math.hypot(x - prevX, y - prevY);
      if (dist > 1.5 && now - lastTrail > 55) {
        spawnTrail(prevX, prevY);
        lastTrail = now;
      }
      prevX = x;
      prevY = y;

      setIdle(now - lastMove > 1400);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('blur', onBlur);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('blur', onBlur);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div ref={layerRef} className="ff-layer" aria-hidden="true">
      <div
        ref={posRef}
        className="ff-pos"
        style={{ ['--ff-color' as string]: color }}
      >
        <div ref={hoverRef} className="ff-hover">
          <div ref={idleRef} className="ff-idle">
            <div className="ff-glow" />
            <svg className="ff-svg" viewBox="0 0 40 40" width={SIZE} height={SIZE}>
              <defs>
                <radialGradient id="ff-halo" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </radialGradient>
                <radialGradient id="ff-wing" cx="32%" cy="28%" r="85%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.16" />
                </radialGradient>
                <radialGradient id="ff-body" cx="42%" cy="36%" r="62%">
                  <stop offset="0%" stopColor="#fffdf4" />
                  <stop offset="42%" stopColor={color} stopOpacity="0.95" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.6" />
                </radialGradient>
              </defs>

              <circle cx="20" cy="20" r="15" fill="url(#ff-halo)" />

              {/* antennae */}
              <path
                d="M18.2 15.2 Q 15.5 10.5 13.4 9"
                fill="none"
                stroke={color}
                strokeOpacity="0.85"
                strokeWidth="0.9"
                strokeLinecap="round"
              />
              <path
                d="M21.8 15.2 Q 24.5 10.5 26.6 9"
                fill="none"
                stroke={color}
                strokeOpacity="0.85"
                strokeWidth="0.9"
                strokeLinecap="round"
              />
              <circle cx="13.4" cy="9" r="1.1" fill="#ffffff" opacity="0.9" />
              <circle cx="26.6" cy="9" r="1.1" fill="#ffffff" opacity="0.9" />

              {/* translucent wings */}
              <g
                className="ff-wing-l"
                fill="url(#ff-wing)"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="0.7"
              >
                <ellipse cx="12" cy="13" rx="9" ry="5.4" transform="rotate(-33 12 13)" />
                <ellipse cx="14" cy="19" rx="6.5" ry="4" transform="rotate(-17 14 19)" />
              </g>
              <g
                className="ff-wing-r"
                fill="url(#ff-wing)"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="0.7"
              >
                <ellipse cx="28" cy="13" rx="9" ry="5.4" transform="rotate(33 28 13)" />
                <ellipse cx="26" cy="19" rx="6.5" ry="4" transform="rotate(17 26 19)" />
              </g>

              {/* glowing body */}
              <circle cx="20" cy="22.5" r="7.4" fill="url(#ff-body)" />
              <circle
                cx="20"
                cy="22.5"
                r="7.4"
                fill="none"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="0.6"
              />
              <ellipse cx="18" cy="20.4" rx="2.3" ry="1.7" fill="#ffffff" opacity="0.85" />

              {/* eyes */}
              <circle cx="17.3" cy="22.4" r="1.25" fill="#2b1c10" opacity="0.85" />
              <circle cx="22.7" cy="22.4" r="1.25" fill="#2b1c10" opacity="0.85" />
              <circle cx="16.9" cy="22" r="0.45" fill="#ffffff" />
              <circle cx="22.3" cy="22" r="0.45" fill="#ffffff" />

              {/* little sparkles */}
              <g fill="#ffffff" opacity="0.9">
                <path d="M7 20 l0.8 1.8 1.8 0.8 -1.8 0.8 -0.8 1.8 -0.8 -1.8 -1.8 -0.8 1.8 -0.8 z" />
                <path d="M33 15 l0.7 1.6 1.6 0.7 -1.6 0.7 -0.7 1.6 -0.7 -1.6 -1.6 -0.7 1.6 -0.7 z" />
                <path d="M30 30 l0.6 1.3 1.3 0.6 -1.3 0.6 -0.6 1.3 -0.6 -1.3 -1.3 -0.6 1.3 -0.6 z" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

FireflyCursor.displayName = 'FireflyCursor';
