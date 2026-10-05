import { cn } from "~~/lib/utils";

/**
 * The Atollway mark: a ring of islands around a lagoon, with the hub at the centre.
 */
export const LogoMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
    <defs>
      <linearGradient id="atollway-mark" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--primary)" />
        <stop offset="100%" stopColor="var(--chain-hedera)" />
      </linearGradient>
    </defs>
    <circle
      cx="16"
      cy="16"
      r="11"
      fill="none"
      stroke="url(#atollway-mark)"
      strokeWidth="2.5"
      strokeDasharray="15 2.3"
    />
    <circle cx="16" cy="16" r="4" fill="url(#atollway-mark)" />
    <circle cx="16" cy="5" r="2.2" fill="var(--chain-base)" />
    <circle cx="25.5" cy="21.5" r="2.2" fill="var(--chain-arbitrum)" />
    <circle cx="6.5" cy="21.5" r="2.2" fill="var(--chain-robinhood)" />
  </svg>
);

export const Logo = ({ className }: { className?: string }) => (
  <span className={cn("flex items-center gap-2.5", className)}>
    <LogoMark />
    <span className="text-lg font-semibold tracking-tight">Atollway</span>
  </span>
);
