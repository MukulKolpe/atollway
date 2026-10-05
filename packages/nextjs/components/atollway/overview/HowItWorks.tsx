import { BadgeCheckIcon, CoinsIcon, WaypointsIcon } from "lucide-react";
import { Card, CardContent } from "~~/components/ui/card";

const STEPS = [
  {
    icon: <BadgeCheckIcon />,
    title: "Get approved once",
    text: "Link the token to your Hedera account and the issuer approves you. Every chain learns about it from the hub.",
  },
  {
    icon: <CoinsIcon />,
    title: "Subscribe with HBAR",
    text: "Pay in HBAR at the issuer's NAV. Chainlink's HBAR/USD price sets how many shares you get.",
  },
  {
    icon: <WaypointsIcon />,
    title: "Hold on any chain",
    text: "Move shares to Base, Arbitrum or Robinhood Chain over Axelar or Chainlink CCIP, and back again.",
  },
];

/**
 * The investor journey in three steps.
 */
export const HowItWorks = () => (
  <div className="grid gap-4 md:grid-cols-3">
    {STEPS.map((step, i) => (
      <Card key={step.title} className="glass">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-chain-hedera/20 text-primary [&_svg]:size-5">
              {step.icon}
            </span>
            <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
          </div>
          <h3 className="text-base font-semibold">{step.title}</h3>
          <p className="text-sm text-muted-foreground">{step.text}</p>
        </CardContent>
      </Card>
    ))}
  </div>
);
