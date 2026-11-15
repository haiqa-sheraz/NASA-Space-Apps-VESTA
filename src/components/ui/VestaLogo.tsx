/**
 * Vesta's own logo (the owner's files in vesta_logo.zip, made with AI tools): a triangle, an amber
 * Earth flame, and the blue microgravity sphere inside it. Drawn inline so it follows the theme:
 * the light triangle on the dark (Ember black) theme and the dark triangle on the light (Ash) theme,
 * using the --logo-* colors in tokens.css. Each copy on a page needs its own idPrefix, because the
 * gradients are referenced by id.
 */

const TRIANGLE = "M88 122 L424 122 L256 412 Z";
const FLAME = "M256 86 C271 138 320 192 320 270 A64 64 0 0 1 192 270 C192 192 241 138 256 86 Z";

function LogoShape({ id, gap }: { id: string; gap: number }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-tri`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--logo-tri-a)" }} />
          <stop offset="1" style={{ stopColor: "var(--logo-tri-b)" }} />
        </linearGradient>
        <linearGradient id={`${id}-flame`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--logo-flame-a)" }} />
          <stop offset="0.45" style={{ stopColor: "var(--logo-flame-b)" }} />
          <stop offset="1" style={{ stopColor: "var(--logo-flame-c)" }} />
        </linearGradient>
        <radialGradient id={`${id}-orb`} cx="0.36" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#D6E4FF" />
          <stop offset="0.25" stopColor="#7FA2FF" />
          <stop offset="0.7" stopColor="#3463F0" />
          <stop offset="1" stopColor="#1C3A9E" />
        </radialGradient>
      </defs>
      <path d={TRIANGLE} fill={`url(#${id}-tri)`} stroke={`url(#${id}-tri)`} strokeWidth="14" strokeLinejoin="round" />
      <path d={FLAME} fill="none" style={{ stroke: "var(--logo-gap)" }} strokeWidth={gap} strokeLinejoin="round" />
      <path d={FLAME} fill={`url(#${id}-flame)`} />
      <circle cx="256" cy="292" r="42" fill={`url(#${id}-orb)`} />
      <ellipse cx="240" cy="276" rx="13" ry="8" fill="#FFFFFF" fillOpacity="0.55" transform="rotate(-25 240 276)" />
    </>
  );
}

/** Small logo (top bar, footer): the icon version, decorative next to the name. */
export function VestaIcon({ idPrefix, className }: { idPrefix: string; className?: string }) {
  return (
    <svg className={className} viewBox="40 40 432 432" aria-hidden="true" focusable="false">
      <LogoShape id={idPrefix} gap={28} />
    </svg>
  );
}

/**
 * Large logo (About page): the mark version with its soft glow. The "AI-generated" note that the
 * large files carry is shown as live text next to it, where it stays readable at any size.
 */
export function VestaMark({ idPrefix, className, label }: { idPrefix: string; className?: string; label: string }) {
  return (
    <svg className={className} viewBox="0 30 512 464" role="img" aria-label={label}>
      <defs>
        <radialGradient id={`${idPrefix}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={{ stopColor: "var(--logo-flame-b)", stopOpacity: 0.22 }} />
          <stop offset="1" style={{ stopColor: "var(--logo-flame-b)", stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <circle cx="256" cy="262" r="230" fill={`url(#${idPrefix}-glow)`} />
      <LogoShape id={idPrefix} gap={22} />
    </svg>
  );
}
