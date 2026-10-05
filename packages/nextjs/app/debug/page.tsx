import { DebugContracts } from "./_components/DebugContracts";
import type { NextPage } from "next";
import { getMetadata } from "~~/utils/scaffold-hbar/getMetadata";

export const metadata = getMetadata({
  title: "Contracts",
  description: "Read and call Atollway's deployed contracts on every chain.",
});

const Debug: NextPage = () => {
  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-6 pt-10 lg:px-10">
        <h1 className="text-4xl font-semibold tracking-tight">Contracts</h1>
        <p className="mt-2 max-w-3xl text-lg text-muted-foreground">
          Read and call the deployed contracts on each chain. The list comes from{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">packages/nextjs/contracts</code>, which{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">yarn foundry:deploy</code> updates.
        </p>
      </div>
      <DebugContracts />
    </>
  );
};

export default Debug;
