"use client";

import { Popover } from "@base-ui/react/popover";
import { Tooltip } from "@base-ui/react/tooltip";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

/**
 * Hamburger dropdown menu.
 * Contains labeled dark mode toggle, inline language switcher, and app version info.
 */
export function HamburgerMenu() {
  const t = useTranslations("session");
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDark = mounted ? theme === "dark" : false;

  return (
    <Popover.Root>
      <Tooltip.Provider delay={400}>
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <Popover.Trigger
                aria-label="Open menu"
                className="flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                style={{ minHeight: "44px", minWidth: "44px" }}
              />
            }
          >
            <Menu className="h-5 w-5" />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner sideOffset={6}>
              <Tooltip.Popup className="rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md z-50">
                Menu
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>

      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8}>
          <Popover.Popup className="z-50 w-64 rounded-2xl border border-border bg-card p-4 shadow-xl">
            <div className="space-y-4">
              {/* Dark mode toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{t("darkMode")}</span>
                <button
                  role="switch"
                  aria-checked={isDark}
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    isDark ? "bg-indigo-500" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      isDark ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Language switcher */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t("language")}
                </p>
                <LanguageSwitcher />
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* App version */}
              <p className="text-xs text-muted-foreground/60">clip v2.2</p>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
