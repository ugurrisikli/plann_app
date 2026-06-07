import type { Transition, Variants } from "framer-motion";

// ── Spring presets ──────────────────────────────────────────────────────────
export const spring: Transition = { type: "spring", stiffness: 300, damping: 30 };
export const gentle: Transition = { type: "spring", stiffness: 200, damping: 25 };
export const snappy: Transition = { duration: 0.15, ease: [0.4, 0, 0.2, 1] };
export const navPill: Transition = { type: "spring", stiffness: 400, damping: 35 };

// ── Stagger helpers ─────────────────────────────────────────────────────────
export const cascade = (i: number): Transition => ({ delay: i * 0.06 });
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

// ── Reusable variants ───────────────────────────────────────────────────────
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: gentle },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: snappy },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show:   { opacity: 1, scale: 1, transition: spring },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  show:   { opacity: 1, y: 0, transition: spring },
};

// ── Card hover ──────────────────────────────────────────────────────────────
export const cardHover = {
  rest:  { y: 0,  boxShadow: "0 2px 12px rgba(255,107,53,0.08), 0 0 0 1px #F0E4D7" },
  hover: { y: -4, boxShadow: "0 8px 32px rgba(255,107,53,0.18), 0 0 0 1px #FFA07A" },
};
