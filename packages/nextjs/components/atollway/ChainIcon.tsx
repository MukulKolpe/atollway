import { cn } from "~~/lib/utils";
import { getProfile } from "~~/utils/atollway/networks";

type ChainIconProps = {
  chainId: number;
  /** Diameter in pixels. */
  size?: number;
  className?: string;
};

/**
 * A round badge in the chain's colour with its glyph.
 */
export const ChainIcon = ({ chainId, size = 20, className }: ChainIconProps) => {
  const { color, glyph, name } = getProfile(chainId);

  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold leading-none text-white shadow-sm ring-1 ring-white/25",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.52),
        backgroundImage: `linear-gradient(140deg, ${color}, color-mix(in oklch, ${color} 62%, black))`,
        textShadow: "0 1px 2px rgb(0 0 0 / 0.35)",
      }}
    >
      {glyph}
    </span>
  );
};
