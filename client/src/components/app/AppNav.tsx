import { useState } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Layers, ListChecks, Moon, Plus, Sun, Timer, User } from "lucide-react";
import KaeWordmark from "./BrandMark";
import { toggleTheme } from "@/lib/theme";

const LINKS = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/flashcards", label: "Cards", icon: Layers },
  { href: "/quiz", label: "Quiz", icon: ListChecks },
  { href: "/timer", label: "Focus", icon: Timer },
  { href: "/materials/new", label: "Upload", icon: Plus },
  { href: "/profile", label: "Me", icon: User },
];

export default function AppNav() {
  const [location] = useLocation();
  const [, force] = useState(false);

  return (
    <>
      {/* desktop top bar */}
      <header className="sticky top-0 z-40 hidden border-b border-border bg-background/85 backdrop-blur md:block">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center text-2xl">
            <KaeWordmark />
          </Link>
          <nav className="flex items-center gap-1" aria-label="Primary">
            {LINKS.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
            <button
              type="button"
              aria-label="Toggle dark mode"
              onClick={() => { toggleTheme(); force((v) => !v); }}
              className="ml-2 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Sun className="h-4 w-4 dark:hidden" />
              <Moon className="hidden h-4 w-4 dark:block" />
            </button>
          </nav>
        </div>
      </header>

      {/* mobile bottom tab bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {LINKS.slice(0, 5).map(({ href, label, icon: Icon }) => {
          const active = location === href;
          return (
            <Link key={href} href={href} className="flex-1 py-2 text-center">
              <span
                className={`mx-auto flex h-8 w-12 items-center justify-center rounded-xl transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className={`mt-0.5 block text-[10.5px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
      {/* bottom padding so content clears the tab bar on mobile */}
      <div aria-hidden className="h-0 md:hidden" style={{ height: 0 }} />
    </>
  );
}
