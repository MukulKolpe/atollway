import Link from "next/link";
import {
  ArrowRightIcon,
  BookOpenIcon,
  FileCode2Icon,
  LayoutDashboardIcon,
  SparklesIcon,
  WaypointsIcon,
} from "lucide-react";
import atollwayConfig from "~~/atollway.config";
import { GitHubIcon } from "~~/components/atollway/BrandIcons";
import { CopyCommand } from "~~/components/atollway/CopyCommand";
import { IDEAS } from "~~/components/atollway/ideas";
import { Badge } from "~~/components/ui/badge";
import { Button } from "~~/components/ui/button";
import { Card, CardContent } from "~~/components/ui/card";

const INSIDE = [
  {
    icon: <FileCode2Icon />,
    title: "Contracts",
    text: "The hub, the spoke gateway and token, Axelar and CCIP adapters, and the Base relay. 164 tests, plus checks against the live testnets.",
  },
  {
    icon: <LayoutDashboardIcon />,
    title: "App",
    text: "This overview, an investor portal and an issuer console, built with shadcn/ui on Tailwind CSS.",
  },
  {
    icon: <WaypointsIcon />,
    title: "Bridges",
    text: "Axelar and Chainlink CCIP behind one interface. A new chain is a deploy script and a config entry.",
  },
  {
    icon: <BookOpenIcon />,
    title: "Docs",
    text: "Architecture, decision records, deploy guides, and an agent guide for AI coding tools.",
  },
];

/**
 * The overview's pitch for the template itself: what comes with it, the command that scaffolds it, and ideas.
 */
export const TemplateShowcase = () => (
  <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-chain-hedera/10 p-6 sm:p-10">
    <div aria-hidden className="absolute inset-0 bg-grid opacity-60" />
    <div className="relative flex flex-col gap-10">
      <div className="grid items-end gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-4">
          <Badge variant="outline" className="h-7 w-fit gap-1.5 rounded-full bg-card/70 px-3 text-sm">
            <SparklesIcon className="text-primary" />
            Scaffold-HBAR template
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Fork it and ship your own</h2>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Everything on this page comes with the template: the contracts, the bridges, the app and the docs. Scaffold
            it with one command, deploy a hub, and this app runs your asset.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <CopyCommand
            command={`npm create scaffold-hbar@latest -- --template ${atollwayConfig.project.template}`}
            title="Terminal"
          />
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg" className="h-11 rounded-full px-5 text-base">
              <Link href="/docs#set-it-up">
                Quick start
                <ArrowRightIcon />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 rounded-full bg-card/60 px-5 text-base">
              <a href={atollwayConfig.project.repository} target="_blank" rel="noreferrer">
                <GitHubIcon className="size-4" />
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {INSIDE.map(item => (
          <Card key={item.title} className="glass">
            <CardContent className="flex flex-col gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:size-5">
                {item.icon}
              </span>
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="text-base text-muted-foreground">{item.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Ideas to build on it
        </span>
        <div className="flex flex-wrap gap-2">
          {IDEAS.map(idea => (
            <Link
              key={idea.id}
              href={`/docs#idea-${idea.id}`}
              className="flex items-center gap-2 rounded-full border bg-card/70 px-4 py-2 text-base transition-colors hover:border-primary/50 hover:text-primary"
            >
              <idea.icon className="size-4 text-primary" />
              {idea.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  </section>
);
