"use client";

import { Popover } from "@base-ui/react/popover";
import { Link2, QrCode, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { CopyButton } from "@/components/session/copy-button";
import { QRCodeClient } from "@/components/session/qr-code-client";

interface HostToolbarProps {
  participantUrl: string;
}

export function HostToolbar({ participantUrl }: HostToolbarProps) {
  const t = useTranslations("session");
  const tPages = useTranslations("pages");

  return (
    <Popover.Root>
      <Popover.Trigger className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">{t("share")}</span>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8}>
          <Popover.Popup className="z-50 w-80 rounded-2xl border border-border bg-card p-5 shadow-xl">
            <div className="mb-4 flex justify-center">
              <QRCodeClient url={participantUrl} size={160} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t("participantUrl")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-xl bg-muted/50 px-3 py-2 font-mono text-xs text-foreground">
                  {participantUrl}
                </code>
                <CopyButton value={participantUrl} label={tPages("copyUrl")} />
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
