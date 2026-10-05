"use client";

import { useId } from "react";
import { Spoke } from "~~/hooks/atollway/useSpokes";
import { cn } from "~~/lib/utils";
import { BRIDGE_NAMES, Bridge } from "~~/utils/atollway/contracts";
import { formatAmount } from "~~/utils/atollway/format";
import { HUB_CHAIN_ID, getProfile } from "~~/utils/atollway/networks";

type Point = { x: number; y: number };

const WIDTH = 640;
const HEIGHT = 410;
const CENTER: Point = { x: 320, y: 232 };
const RING = { rx: 235, ry: 150 };
const HUB_RADIUS = 46;
const SPOKE_RADIUS = 27;

const BRIDGE_COLORS: Record<Bridge, string> = {
  axelar: "var(--chart-1)",
  ccip: "var(--chart-3)",
};

/** Spokes sit on an ellipse around the hub, like islands around a lagoon, starting at the lower right. */
function spokePosition(index: number, count: number): Point {
  const angle = ((90 - (360 * (index + 0.5)) / count) * Math.PI) / 180;
  return { x: CENTER.x + RING.rx * Math.cos(angle), y: CENTER.y + RING.ry * Math.sin(angle) };
}

/** A gentle curve from `from` to `to`, bent sideways by `bend` pixels. Returns the path and its midpoint. */
function curve(from: Point, to: Point, bend: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const control = { x: (from.x + to.x) / 2 - (dy / length) * bend, y: (from.y + to.y) / 2 + (dx / length) * bend };
  const mid = { x: (from.x + 2 * control.x + to.x) / 4, y: (from.y + 2 * control.y + to.y) / 4 };
  return { d: `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`, mid };
}

/** The arc of the ring from one island to another, the short way round. */
function ringArc(from: Point, to: Point) {
  const angle = (p: Point) => Math.atan2((p.y - CENTER.y) / RING.ry, (p.x - CENTER.x) / RING.rx);
  let delta = angle(to) - angle(from);
  if (delta > Math.PI) delta -= 2 * Math.PI;
  if (delta < -Math.PI) delta += 2 * Math.PI;
  const midAngle = angle(from) + delta / 2;
  const mid = { x: CENTER.x + RING.rx * Math.cos(midAngle), y: CENTER.y + RING.ry * Math.sin(midAngle) };
  return { d: `A ${RING.rx} ${RING.ry} 0 0 ${delta > 0 ? 1 : 0} ${to.x} ${to.y}`, mid };
}

type Route = {
  chainId: number;
  bridge?: Bridge;
  d: string;
  label: Point;
  labelText: string;
};

type NetworkMapProps = {
  spokes: Spoke[];
  hederaSupply?: bigint;
  totalSupply?: bigint;
  decimals: number;
  symbol: string;
  /** The chain to highlight, for example while its row in a list is hovered. */
  active?: number;
  onActiveChange?: (chainId: number | undefined) => void;
  className?: string;
};

/**
 * The hub on Hedera and its spokes, with animated message routes labelled by bridge.
 */
export const NetworkMap = ({
  spokes,
  hederaSupply,
  totalSupply,
  decimals,
  symbol,
  active,
  onActiveChange,
  className,
}: NetworkMapProps) => {
  const id = useId().replace(/:/g, "");
  const positions = new Map(spokes.map((spoke, i) => [spoke.chainId, spokePosition(i, spokes.length)]));

  const routes: Route[] = spokes.flatMap(spoke => {
    const position = positions.get(spoke.chainId)!;
    const relay = spoke.route?.relayChainId !== undefined ? positions.get(spoke.route.relayChainId) : undefined;
    const bridgeName = spoke.bridge ? BRIDGE_NAMES[spoke.bridge] : "Bridge";
    if (relay) {
      const toRelay = curve(CENTER, relay, -38);
      const arc = ringArc(relay, position);
      return [
        {
          chainId: spoke.chainId,
          bridge: spoke.bridge,
          d: `${toRelay.d} ${arc.d}`,
          label: arc.mid,
          labelText: `${bridgeName} via relay`,
        },
      ];
    }
    const direct = curve(CENTER, position, 22);
    return [{ chainId: spoke.chainId, bridge: spoke.bridge, d: direct.d, label: direct.mid, labelText: bridgeName }];
  });

  const share = (amount?: bigint) =>
    amount !== undefined && totalSupply ? Number((amount * 10_000n) / totalSupply) / 10_000 : 0;

  const dimmed = (chainId: number) => active !== undefined && active !== chainId && active !== HUB_CHAIN_ID;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Map of the hub on Hedera and its spokes"
      className={cn("h-auto w-full select-none", className)}
    >
      <defs>
        <radialGradient id={`${id}-hub`} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--chain-hedera)" />
        </radialGradient>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      <ellipse
        cx={CENTER.x}
        cy={CENTER.y}
        rx={RING.rx}
        ry={RING.ry}
        fill="none"
        stroke="var(--border)"
        strokeWidth={1.5}
        strokeDasharray="2 7"
        strokeLinecap="round"
      />

      {routes.map(route => {
        const color = route.bridge ? BRIDGE_COLORS[route.bridge] : "var(--muted-foreground)";
        const pathId = `${id}-route-${route.chainId}`;
        return (
          <g
            key={route.chainId}
            className="transition-opacity duration-300"
            style={{ opacity: dimmed(route.chainId) ? 0.2 : 1 }}
          >
            <path id={pathId} d={route.d} fill="none" stroke={color} strokeOpacity={0.25} strokeWidth={6} />
            <path
              d={route.d}
              fill="none"
              stroke={color}
              strokeWidth={1.75}
              strokeDasharray="4 8"
              strokeLinecap="round"
              className="motion-safe:animate-flow"
            />
            <g className="motion-reduce:hidden">
              <circle r={3.5} fill={color}>
                <animateMotion dur="3.2s" repeatCount="indefinite">
                  <mpath href={`#${pathId}`} />
                </animateMotion>
              </circle>
              <circle r={3.5} fill={color} opacity={0.7}>
                <animateMotion dur="3.2s" begin="1.6s" repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1">
                  <mpath href={`#${pathId}`} />
                </animateMotion>
              </circle>
            </g>
            <g transform={`translate(${route.label.x} ${route.label.y})`}>
              <rect
                x={-route.labelText.length * 3.3 - 10}
                y={-11}
                width={route.labelText.length * 6.6 + 20}
                height={22}
                rx={11}
                fill="var(--card)"
                stroke={color}
                strokeOpacity={0.5}
              />
              <text textAnchor="middle" dy="0.35em" fontSize={11} fontWeight={500} fill="var(--foreground)">
                {route.labelText}
              </text>
            </g>
          </g>
        );
      })}

      <g onMouseEnter={() => onActiveChange?.(HUB_CHAIN_ID)} onMouseLeave={() => onActiveChange?.(undefined)}>
        <circle
          cx={CENTER.x}
          cy={CENTER.y}
          r={HUB_RADIUS + 14}
          fill="var(--primary)"
          opacity={0.35}
          filter={`url(#${id}-glow)`}
        />
        <circle
          cx={CENTER.x}
          cy={CENTER.y}
          r={HUB_RADIUS}
          fill="none"
          stroke="var(--primary)"
          strokeOpacity={0.6}
          className="motion-safe:animate-ping-slow origin-center [transform-box:fill-box]"
        />
        <circle cx={CENTER.x} cy={CENTER.y} r={HUB_RADIUS} fill={`url(#${id}-hub)`} />
        <text x={CENTER.x} y={CENTER.y} textAnchor="middle" dy="0.36em" fontSize={34} fontWeight={600} fill="white">
          ℏ
        </text>
        <text
          x={CENTER.x}
          y={CENTER.y + HUB_RADIUS + 22}
          textAnchor="middle"
          fontSize={13}
          fontWeight={600}
          fill="var(--foreground)"
        >
          Hedera hub
        </text>
        <text
          x={CENTER.x}
          y={CENTER.y + HUB_RADIUS + 39}
          textAnchor="middle"
          fontSize={11.5}
          fill="var(--muted-foreground)"
        >
          {formatAmount(hederaSupply, decimals, 2)} {symbol}
        </text>
      </g>

      {spokes.map(spoke => {
        const position = positions.get(spoke.chainId)!;
        const { color, glyph, name } = getProfile(spoke.chainId);
        const circumference = 2 * Math.PI * (SPOKE_RADIUS + 6);
        const fraction = share(spoke.supply ?? spoke.outstanding);
        const above = position.y < CENTER.y;
        return (
          <g
            key={spoke.chainId}
            className="cursor-default transition-opacity duration-300"
            style={{ opacity: dimmed(spoke.chainId) ? 0.35 : 1 }}
            onMouseEnter={() => onActiveChange?.(spoke.chainId)}
            onMouseLeave={() => onActiveChange?.(undefined)}
          >
            <circle cx={position.x} cy={position.y} r={SPOKE_RADIUS + 6} fill="var(--card)" stroke="var(--border)" />
            <circle
              cx={position.x}
              cy={position.y}
              r={SPOKE_RADIUS + 6}
              fill="none"
              stroke={color}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={`${fraction * circumference} ${circumference}`}
              transform={`rotate(-90 ${position.x} ${position.y})`}
              className="transition-[stroke-dasharray] duration-700"
            />
            <circle cx={position.x} cy={position.y} r={SPOKE_RADIUS - 2} fill={color} />
            <text
              x={position.x}
              y={position.y}
              textAnchor="middle"
              dy="0.36em"
              fontSize={20}
              fontWeight={600}
              fill="white"
            >
              {glyph}
            </text>
            <text
              x={position.x}
              y={above ? position.y - SPOKE_RADIUS - 28 : position.y + SPOKE_RADIUS + 24}
              textAnchor="middle"
              fontSize={13}
              fontWeight={600}
              fill="var(--foreground)"
            >
              {name}
            </text>
            <text
              x={position.x}
              y={above ? position.y - SPOKE_RADIUS - 12 : position.y + SPOKE_RADIUS + 40}
              textAnchor="middle"
              fontSize={11.5}
              fill="var(--muted-foreground)"
            >
              {formatAmount(spoke.supply ?? spoke.outstanding, decimals, 2)} {symbol}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
