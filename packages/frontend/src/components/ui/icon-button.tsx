"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import * as React from "react";

import { cn } from "@/lib/utils";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Tooltip text shown on hover. Also used as aria-label if not provided. */
  tooltip: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Reusable icon-only button with built-in @base-ui/react Tooltip.
 *
 * Every icon-only button in the app should use this component to ensure
 * consistent tooltip behavior and accessible aria-labels.
 */
export function IconButton({
  tooltip,
  children,
  className,
  "aria-label": ariaLabel,
  disabled,
  ...props
}: IconButtonProps) {
  return (
    <Tooltip.Provider delay={400}>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <button
              aria-label={ariaLabel ?? tooltip}
              disabled={disabled}
              className={cn(
                "inline-flex items-center justify-center rounded-lg p-1.5",
                "text-muted-foreground transition-colors",
                "hover:bg-accent hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50",
                "min-h-[44px] min-w-[44px]",
                "disabled:pointer-events-none disabled:opacity-50",
                className,
              )}
              {...props}
            />
          }
        >
          {children}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner sideOffset={6}>
            <Tooltip.Popup className="rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md z-50 animate-in fade-in-0 zoom-in-95">
              {tooltip}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
