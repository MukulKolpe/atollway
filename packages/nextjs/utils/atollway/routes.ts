import atollwayConfig from "~~/atollway.config";
import { Bridge, bridgeOf } from "~~/utils/atollway/contracts";
import { HUB_CHAIN_ID } from "~~/utils/atollway/networks";

export type Route = {
  bridge?: Bridge;
  /** Each leg a message travels: one, or two through a relay. */
  hops: { from: number; to: number }[];
  /** Typical minutes from sending to arrival. */
  minutes: number;
};

/**
 * How a transfer between Hedera and `spokeId` travels, in `direction`.
 */
export function routeOf(spokeId: number, direction: "toSpoke" | "toHub"): Route {
  const config = atollwayConfig.routes[spokeId];
  const [from, to] = direction === "toSpoke" ? [HUB_CHAIN_ID, spokeId] : [spokeId, HUB_CHAIN_ID];
  const relay = config?.relayChainId;
  return {
    bridge: bridgeOf(spokeId),
    hops: relay
      ? [
          { from, to: relay },
          { from: relay, to },
        ]
      : [{ from, to }],
    minutes: (direction === "toSpoke" ? config?.minutesFromHub : config?.minutesToHub) ?? 30,
  };
}
