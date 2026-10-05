"use client";

import { useState } from "react";
import { CirclePauseIcon, CirclePlayIcon, LandmarkIcon, TagIcon, TimerIcon } from "lucide-react";
import { Address, formatUnits, isAddress, parseUnits } from "viem";
import { useReadContract } from "wagmi";
import { ConfirmDialog } from "~~/components/atollway/issuer/ConfirmDialog";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~~/components/ui/card";
import { Input } from "~~/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~~/components/ui/input-group";
import { Spinner } from "~~/components/ui/spinner";
import { useHub } from "~~/hooks/atollway/useHub";
import { useIssuer } from "~~/hooks/atollway/useIssuer";
import { useSpokes } from "~~/hooks/atollway/useSpokes";
import { useTransaction } from "~~/hooks/atollway/useTransaction";
import { hub } from "~~/utils/atollway/contracts";
import { formatHbar, hubFeeValue } from "~~/utils/atollway/fees";
import { shortAddress, timeAgo } from "~~/utils/atollway/format";
import { HUB_CHAIN_ID, accountUrl } from "~~/utils/atollway/networks";

const NAV_DECIMALS = 8;

type SettingProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  current: React.ReactNode;
  children: React.ReactNode;
};

const Setting = ({ icon, title, description, current, children }: SettingProps) => (
  <Card className="glass">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg">
        <span className="text-primary [&_svg]:size-5">{icon}</span>
        {title}
      </CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col gap-3">
      <div className="text-2xl font-semibold tracking-tight">{current}</div>
      {children}
    </CardContent>
  </Card>
);

/**
 * The hub's settings: NAV, how old a price may be, where subscription payments go, and the pause switch.
 */
export const SettingsPanel = () => {
  const hubState = useHub();
  const { spokes } = useSpokes();
  const { isIssuer, pauseFee } = useIssuer();
  const tx = useTransaction();
  const [nav, setNav] = useState("");
  const [maxAgeHours, setMaxAgeHours] = useState("");
  const [recipient, setRecipient] = useState("");
  const [confirmPause, setConfirmPause] = useState(false);
  const proceeds = useReadContract({ ...hub, functionName: "proceedsRecipient" });
  const paused = hubState.paused;

  const run = async (call: Parameters<typeof tx.send>[0], reset: () => void) => {
    const receipt = await tx.send(call);
    if (receipt) {
      reset();
      await Promise.all([hubState.refetch(), proceeds.refetch()]);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Setting
        icon={<TagIcon />}
        title="Net asset value"
        description="US dollars per share. Subscriptions price shares at this value. Zero closes subscriptions."
        current={
          hubState.nav !== undefined
            ? Number(formatUnits(hubState.nav, NAV_DECIMALS)).toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              })
            : "–"
        }
      >
        <div className="flex gap-2">
          <InputGroup>
            <InputGroupAddon>$</InputGroupAddon>
            <InputGroupInput
              inputMode="decimal"
              placeholder="1.00"
              value={nav}
              onChange={event => /^\d*\.?\d{0,8}$/.test(event.target.value) && setNav(event.target.value)}
              aria-label="New NAV in US dollars"
            />
          </InputGroup>
          <Button
            disabled={!isIssuer || !nav || tx.isBusy}
            onClick={() =>
              run(
                {
                  ...hub,
                  functionName: "setNav",
                  args: [parseUnits(nav, NAV_DECIMALS)],
                  label: `Set the NAV to $${nav}`,
                },
                () => setNav(""),
              )
            }
          >
            Update
          </Button>
        </div>
      </Setting>

      <Setting
        icon={<TimerIcon />}
        title="Price freshness"
        description="The oldest Chainlink HBAR/USD price that subscriptions accept. Match it to the feed's heartbeat."
        current={hubState.maxPriceAge !== undefined ? `${Number(hubState.maxPriceAge) / 3600} hours` : "–"}
      >
        <p className="text-sm text-muted-foreground">
          Latest price {hubState.priceUpdatedAt ? timeAgo(hubState.priceUpdatedAt) : "–"}
          {hubState.priceStale && ", too old: subscriptions are waiting"}.
        </p>
        <div className="flex gap-2">
          <InputGroup>
            <InputGroupInput
              inputMode="decimal"
              placeholder="25"
              value={maxAgeHours}
              onChange={event => /^\d*\.?\d{0,2}$/.test(event.target.value) && setMaxAgeHours(event.target.value)}
              aria-label="Oldest price in hours"
            />
            <InputGroupAddon align="inline-end">hours</InputGroupAddon>
          </InputGroup>
          <Button
            disabled={!isIssuer || !maxAgeHours || tx.isBusy}
            onClick={() =>
              run(
                {
                  ...hub,
                  functionName: "setMaxPriceAge",
                  args: [BigInt(Math.round(Number(maxAgeHours) * 3600))],
                  label: `Accept prices up to ${maxAgeHours} hours old`,
                },
                () => setMaxAgeHours(""),
              )
            }
          >
            Update
          </Button>
        </div>
      </Setting>

      <Setting
        icon={<LandmarkIcon />}
        title="Proceeds"
        description="Where the HBAR paid for subscriptions goes, in the same transaction."
        current={
          proceeds.data ? (
            <a
              href={accountUrl(HUB_CHAIN_ID, proceeds.data)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-lg hover:underline"
            >
              {shortAddress(proceeds.data, 6)}
            </a>
          ) : (
            "–"
          )
        }
      >
        <div className="flex gap-2">
          <Input
            placeholder="0x…"
            value={recipient}
            onChange={event => setRecipient(event.target.value.trim())}
            className="font-mono"
            aria-label="New proceeds recipient"
          />
          <Button
            disabled={!isIssuer || !isAddress(recipient) || tx.isBusy}
            onClick={() =>
              run(
                {
                  ...hub,
                  functionName: "setProceedsRecipient",
                  args: [recipient as Address],
                  label: `Send proceeds to ${shortAddress(recipient)}`,
                },
                () => setRecipient(""),
              )
            }
          >
            Update
          </Button>
        </div>
      </Setting>

      <Card className={paused ? "glass border-destructive/40" : "glass"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {paused ? (
              <CirclePlayIcon className="size-5 text-success" />
            ) : (
              <CirclePauseIcon className="size-5 text-destructive" />
            )}
            {paused ? "The asset is paused" : "Pause everything"}
          </CardTitle>
          <CardDescription>
            {paused
              ? "Nothing moves on Hedera or on any spoke. Resuming tells every spoke too."
              : "Stops subscriptions, transfers and bridging on Hedera and on every spoke, for incidents. Each spoke's guardian can also pause it locally."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant={paused ? "default" : "destructive"}
            disabled={!isIssuer || pauseFee === undefined || tx.isBusy}
            onClick={() => setConfirmPause(true)}
          >
            {tx.isBusy && confirmPause && <Spinner />}
            {paused ? "Resume" : "Pause"} on every chain
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmPause}
        onOpenChange={open => !open && !tx.isBusy && setConfirmPause(false)}
        title={paused ? "Resume the asset everywhere?" : "Pause the asset everywhere?"}
        description={
          paused
            ? "Hedera resumes right away. Each spoke resumes when the message arrives."
            : "Hedera pauses right away. Each spoke pauses when the message arrives, usually within minutes."
        }
        details={
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Bridge fee for {spokes.length} spokes</span>
            <span>{formatHbar(pauseFee)}, unused part refunded</span>
          </div>
        }
        confirmLabel={paused ? "Resume" : "Pause"}
        destructive={!paused}
        busy={tx.isBusy}
        onConfirm={() =>
          pauseFee !== undefined &&
          run(
            {
              ...hub,
              functionName: paused ? "unpause" : "pause",
              value: hubFeeValue(pauseFee),
              label: paused ? "Resume the asset" : "Pause the asset",
            },
            () => setConfirmPause(false),
          )
        }
      />
    </div>
  );
};
