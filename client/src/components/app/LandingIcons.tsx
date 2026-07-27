// Custom duotone icon set for the landing page, drawn in the nkae brand
// language: currentColor strokes with Marker Gold accents and the fold motif.
type IconProps = { className?: string; size?: number };
const GOLD = "#ffd44d";

export function IconUpload({ className = "", size = 34 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <rect x="12" y="8" width="24" height="32" rx="4.5" stroke="currentColor" strokeWidth="3" />
      <path d="M27 8 L36 17 H31 A4 4 0 0 1 27 13 Z" fill={GOLD} />
      <path d="M24 33 V22 M24 22 L19.5 26.5 M24 22 L28.5 26.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconGenerate({ className = "", size = 34 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <path d="M22 10 L25 19.5 L34.5 22.5 L25 25.5 L22 35 L19 25.5 L9.5 22.5 L19 19.5 Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M36 8 L37.6 12 L41.6 13.6 L37.6 15.2 L36 19.2 L34.4 15.2 L30.4 13.6 L34.4 12 Z" fill={GOLD} />
      <path d="M35 30 L36.2 33 L39.2 34.2 L36.2 35.4 L35 38.4 L33.8 35.4 L30.8 34.2 L33.8 33 Z" fill={GOLD} />
    </svg>
  );
}

export function IconSchedule({ className = "", size = 34 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <rect x="9" y="12" width="30" height="27" rx="4.5" stroke="currentColor" strokeWidth="3" />
      <path d="M9 21 H39" stroke="currentColor" strokeWidth="3" />
      <path d="M17 8 V14 M31 8 V14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="30" r="4.5" fill={GOLD} />
      <circle cx="15.5" cy="30" r="2" fill="currentColor" opacity="0.5" />
      <circle cx="32.5" cy="30" r="2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

export function IconSummary({ className = "", size = 30 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <rect x="11" y="7" width="26" height="34" rx="4.5" stroke="currentColor" strokeWidth="3" />
      <path d="M17 16 H31" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <rect x="15.5" y="21.5" width="18" height="6" rx="2" fill={GOLD} opacity="0.9" />
      <path d="M17 24.5 H31" stroke="#1c1a24" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M17 33 H26" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconCards({ className = "", size = 30 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <rect x="18" y="7" width="21" height="27" rx="4" stroke="currentColor" strokeWidth="2.6" opacity="0.45" />
      <rect x="9" y="13" width="22" height="28" rx="4.5" stroke="currentColor" strokeWidth="3" />
      <path d="M24.5 13 H31 V21 Z" fill={GOLD} />
      <path d="M14.5 28 H24 M14.5 34 H20.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconQuiz({ className = "", size = 30 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <rect x="8" y="10" width="29" height="30" rx="5" stroke="currentColor" strokeWidth="3" />
      <circle cx="16" cy="21" r="2.6" stroke="currentColor" strokeWidth="2.4" />
      <path d="M22.5 21 H31" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="16" cy="31" r="2.6" stroke="currentColor" strokeWidth="2.4" />
      <path d="M22.5 31 H31" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="37" cy="12.5" r="7" fill={GOLD} />
      <path d="M33.8 12.5 L36 14.7 L40.2 10.5" stroke="#1c1a24" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconFocus({ className = "", size = 30 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <rect x="20.5" y="5" width="7" height="4.5" rx="2" fill="currentColor" />
      <circle cx="24" cy="27" r="14" stroke="currentColor" strokeWidth="3" />
      <path d="M24 13 A14 14 0 0 1 36.5 21" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M24 27 V18.5" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="27" r="2.4" fill="currentColor" />
    </svg>
  );
}
