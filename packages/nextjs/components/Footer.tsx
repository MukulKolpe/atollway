import React from "react";
import Link from "next/link";
import { LogoMark } from "~~/components/atollway/Logo";

/**
 * Site footer
 */
export const Footer = () => {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <LogoMark className="size-5" />
          <span>
            Atollway. Built with{" "}
            <a
              href="https://github.com/hedera-dev/scaffold-hbar"
              target="_blank"
              rel="noreferrer"
              className="text-foreground hover:underline"
            >
              Scaffold-HBAR
            </a>{" "}
            on Hedera.
          </span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/debug" className="hover:text-foreground">
            Contracts
          </Link>
          <a href="https://docs.hedera.com/" target="_blank" rel="noreferrer" className="hover:text-foreground">
            Hedera docs
          </a>
          <a href="https://portal.hedera.com/faucet" target="_blank" rel="noreferrer" className="hover:text-foreground">
            HBAR faucet
          </a>
        </nav>
      </div>
    </footer>
  );
};
