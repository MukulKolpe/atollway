import React from "react";
import Link from "next/link";
import { HeartIcon } from "lucide-react";
import atollwayConfig from "~~/atollway.config";
import { GitHubIcon, XLogoIcon } from "~~/components/atollway/BrandIcons";
import { CopyCommand } from "~~/components/atollway/CopyCommand";
import { Logo } from "~~/components/atollway/Logo";

const { project } = atollwayConfig;

type FooterLink = { label: string; href: string };

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "App",
    links: [
      { label: "Overview", href: "/" },
      { label: "Invest", href: "/invest" },
      { label: "Issuer console", href: "/issuer" },
      { label: "Contracts", href: "/debug" },
    ],
  },
  {
    title: "Template",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "Source on GitHub", href: project.repository },
      { label: "Architecture", href: `${project.repository}/blob/main/docs/architecture.md` },
      { label: "Deployments", href: `${project.repository}/blob/main/docs/deployments.md` },
    ],
  },
  {
    title: "Hedera",
    links: [
      { label: "Scaffold-HBAR", href: "https://github.com/hedera-dev/scaffold-hbar" },
      { label: "Hedera docs", href: "https://docs.hedera.com/" },
      { label: "HBAR faucet", href: "https://portal.hedera.com/faucet" },
      { label: "HashScan", href: "https://hashscan.io/testnet" },
    ],
  },
];

const FooterLinkItem = ({ label, href }: FooterLink) =>
  href.startsWith("/") ? (
    <Link href={href} className="text-muted-foreground transition-colors hover:text-foreground">
      {label}
    </Link>
  ) : (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-muted-foreground transition-colors hover:text-foreground"
    >
      {label}
    </a>
  );

/**
 * Site footer
 */
export const Footer = () => {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-sm text-base text-muted-foreground">
            A Scaffold-HBAR template for tokenized funds: issue on Hedera, hold on any chain, with compliance that
            follows the shares.
          </p>
          <CopyCommand
            command={`npm create scaffold-hbar@latest -- --template ${project.template}`}
            className="max-w-md"
          />
        </div>
        {COLUMNS.map(column => (
          <nav key={column.title} className="flex flex-col gap-3 text-base">
            <span className="text-sm font-semibold tracking-wide text-foreground uppercase">{column.title}</span>
            {column.links.map(link => (
              <FooterLinkItem key={link.label} {...link} />
            ))}
          </nav>
        ))}
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6">
          <p className="flex flex-wrap items-center justify-center gap-x-1.5 text-base text-muted-foreground">
            Shipped with <HeartIcon className="size-4 fill-current text-[oklch(0.68_0.2_20)]" aria-label="love" /> by
            <a
              href={project.author.github}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-foreground underline-offset-4 hover:underline"
            >
              {project.author.name}
            </a>
            <span className="text-muted-foreground/60">·</span>
            MIT licensed
            <span className="text-muted-foreground/60">·</span>
            Unaudited, testnet only
          </p>
          <div className="flex items-center gap-2">
            <a
              href={project.author.github}
              target="_blank"
              rel="noreferrer"
              aria-label={`${project.author.name} on GitHub`}
              className="flex size-10 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-foreground"
            >
              <GitHubIcon />
            </a>
            <a
              href={project.author.twitter}
              target="_blank"
              rel="noreferrer"
              aria-label={`${project.author.name} on X`}
              className="flex size-10 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-foreground"
            >
              <XLogoIcon />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
