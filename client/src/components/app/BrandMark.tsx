// Nkae brand system: Option B, "the Folded k". nkae, Twi: remembrance.
// KaeMark: standalone badge icon (drawn k + gold fold), for app icon contexts.
// KaeWordmark: lowercase "kae" in Manrope with the k's tip folded in gold.

export function KaeMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Nkae logo" className={className}>
      <rect width="64" height="64" rx="14" fill="#1c1a24" />
      {/* geometric lowercase k, stroke-drawn */}
      <path d="M24 24 V52" stroke="#faf8f4" strokeWidth="8" strokeLinecap="round" />
      <path d="M24 38 L41 26" stroke="#faf8f4" strokeWidth="8" strokeLinecap="round" />
      <path d="M28 35 L43 52" stroke="#faf8f4" strokeWidth="8" strokeLinecap="round" />
      {/* the folded tip */}
      <path d="M20 10 H33 L20 25 Z" fill="#ffd44d" />
    </svg>
  );
}

export default function KaeWordmark({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span
      className={`group/logo relative inline-flex items-baseline font-extrabold tracking-tight ${dark ? "text-[#faf8f4]" : "text-foreground"} ${className}`}
      style={{ fontFamily: "Manrope, Inter, sans-serif" }}
      aria-label="Nkae"
    >
      nkae
      <svg
        viewBox="0 0 16 16"
        aria-hidden
        className="absolute left-[0.64em] top-[0.06em] h-[0.42em] w-[0.42em] origin-top-left transition-transform duration-300 ease-out group-hover/logo:rotate-[-14deg] group-hover/logo:scale-110"
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
      >
        <path d="M2 2 h10 l-10 12 Z" fill="#ffd44d" />
      </svg>
    </span>
  );
}


// Animated badge: strokes draw in, the fold springs on with a soft shadow.
// Used on loading screens; respects reduced motion via framer's hook.
import { motion, useReducedMotion } from "framer-motion";

export function AnimatedKaeMark({ size = 96 }: { size?: number }) {
  const reduced = useReducedMotion();
  if (reduced) return <KaeMark size={size} />;

  const stroke = {
    initial: { pathLength: 0 },
    animate: { pathLength: 1 },
  };

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Nkae loading"
      style={{ filter: "drop-shadow(0 14px 28px rgba(0,0,0,0.35)) drop-shadow(0 3px 8px rgba(0,0,0,0.25))" }}
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 1.8 }}
    >
      <rect width="64" height="64" rx="14" fill="#1c1a24" />
      <motion.path d="M24 24 V52" stroke="#faf8f4" strokeWidth="8" strokeLinecap="round" fill="none"
        {...stroke} transition={{ duration: 0.5, delay: 0.1, ease: [0.33, 1, 0.68, 1] }} />
      <motion.path d="M24 38 L41 26" stroke="#faf8f4" strokeWidth="8" strokeLinecap="round" fill="none"
        {...stroke} transition={{ duration: 0.4, delay: 0.45, ease: [0.33, 1, 0.68, 1] }} />
      <motion.path d="M28 35 L43 52" stroke="#faf8f4" strokeWidth="8" strokeLinecap="round" fill="none"
        {...stroke} transition={{ duration: 0.4, delay: 0.7, ease: [0.33, 1, 0.68, 1] }} />
      <motion.path d="M21.5 12 H34.5 L21.5 27 Z" fill="rgba(0,0,0,0.4)"
        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ originX: "20px", originY: "10px" }}
        transition={{ type: "spring", stiffness: 320, damping: 15, delay: 1.0 }} />
      <motion.path d="M20 10 H33 L20 25 Z" fill="#ffd44d"
        initial={{ scale: 0, rotate: -24, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }}
        style={{ originX: "20px", originY: "10px" }}
        transition={{ type: "spring", stiffness: 320, damping: 15, delay: 1.05 }} />
    </motion.svg>
  );
}
