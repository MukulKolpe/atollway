"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";
import { SwitchTheme } from "~~/components/SwitchTheme";
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
              "rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              isActive && "bg-foreground/[0.06] text-foreground dark:bg-white/10",
              vertical && "rounded-lg px-3 py-2.5 text-base",
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
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-lg" className="md:hidden" aria-label="Open menu">
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle>
                <Logo />
              </SheetTitle>
            </SheetHeader>
            <div className="px-4">
              <HeaderMenuLinks vertical onNavigate={() => setMenuOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>
        <Badge variant="outline" className="hidden text-muted-foreground lg:inline-flex">
          Testnet
        </Badge>
        <div className="hidden flex-1 justify-center md:flex">
          <HeaderMenuLinks />
        </div>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <SwitchTheme className="hidden sm:inline-flex" />
          <RainbowKitCustomConnectButton />
        </div>
      </div>
    </header>
  );
};
