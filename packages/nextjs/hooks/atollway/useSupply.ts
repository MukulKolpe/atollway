import { useHub } from "~~/hooks/atollway/useHub";
import { useSpokes } from "~~/hooks/atollway/useSpokes";

const sum = (values: (bigint | undefined)[]) =>
  values.some(value => value === undefined) ? undefined : values.reduce<bigint>((a, b) => a + (b ?? 0n), 0n);

/**
 * Where the shares are. Total supply is what Hedera holds plus what the hub's ledger says each spoke holds.
 * A spoke's own supply lags its ledger entry while a transfer is on a bridge, and the difference is in transit.
 */
export function useSupply() {
  const hubState = useHub();
  const { spokes, isLoading } = useSpokes();

  const outstanding = sum(spokes.map(spoke => spoke.outstanding));
  const spokeSupply = sum(spokes.map(spoke => spoke.supply));
  const total =
    hubState.hederaSupply !== undefined && outstanding !== undefined ? hubState.hederaSupply + outstanding : undefined;
  const inTransit = outstanding !== undefined && spokeSupply !== undefined ? outstanding - spokeSupply : undefined;

  return { hub: hubState, spokes, total, inTransit, isLoading: hubState.isLoading || isLoading };
}
