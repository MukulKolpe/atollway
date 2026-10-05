"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";
import atollwayConfig from "~~/atollway.config";
import { SwitchTheme } from "~~/components/SwitchTheme";
import { GitHubIcon } from "~~/components/atollway/BrandIcons";
import { Logo } from "~~/components/atollway/Logo";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-hbar";
import { Badge } from "~~/components/ui/badge";
import { Button } from "~~/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "~~/components/ui/sheet";
import { cn } from "~~/lib/utils";

type HeaderMenuLink = {
  label: string;
  href: string;
};

export const menuLinks: HeaderMenuLink[] = [
  { label: "Overview", href: "/" },
  { label: "Invest", href: "/invest" },
  { label: "Issuer", href: "/issuer" },
  { label: "Docs", href: "/docs" },
  { label: "Contracts", href: "/debug" },
];

const HeaderMenuLinks = ({ onNavigate, vertical }: { onNavigate?: () => void; vertical?: boolean }) => {
  const pathname = usePathname();

  return (
    <nav className={cn("flex gap-1", vertical && "flex-col")}>
      {menuLinks.map(({ label, href }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "rounded-full px-4 py-2 text-base font-medium text-muted-foreground transition-colors hover:text-foreground",
              isActive && "bg-foreground/[0.07] text-foreground dark:bg-white/10",
              vertical && "rounded-lg px-3 py-3 text-lg",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
};

/**
 * Site header
 */
export const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-lg" className="lg:hidden" aria-label="Open menu">
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <SheetHeader>
              <SheetTitle>
                <Logo />
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-6 px-4">
              <HeaderMenuLinks vertical onNavigate={() => setMenuOpen(false)} />
              <div className="flex items-center gap-2">
                <SwitchTheme />
                <Button asChild variant="ghost" size="icon-lg">
                  <a
                    href={atollwayConfig.project.repository}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Atollway on GitHub"
                  >
                    <GitHubIcon />
                  </a>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>
        <Badge variant="outline" className="hidden h-6 px-2.5 text-xs text-muted-foreground xl:inline-flex">
          Scaffold-HBAR template
        </Badge>
        <div className="hidden flex-1 justify-center lg:flex">
          <HeaderMenuLinks />
        </div>
        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <Button asChild variant="ghost" size="icon-lg" className="hidden sm:inline-flex">
            <a
              href={atollwayConfig.project.repository}
              target="_blank"
              rel="noreferrer"
              aria-label="Atollway on GitHub"
            >
              <GitHubIcon />
            </a>
          </Button>
          <SwitchTheme className="hidden sm:inline-flex" />
          <RainbowKitCustomConnectButton />
        </div>
      </div>
    </header>
  );
};
