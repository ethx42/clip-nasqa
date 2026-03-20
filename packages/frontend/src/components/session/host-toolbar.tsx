"use client";

import { Popover } from "@base-ui/react/popover";
import { Copy, Link2, QrCode, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { CopyButton } from "@/components/session/copy-button";
import { QRCodeClient } from "@/components/session/qr-code-client";
import { formatCode } from "@/lib/format-code";

interface HostToolbarProps {
  participantUrl: string;
  sessionCode: string;
}

export function HostToolbar({ participantUrl, sessionCode }: HostToolbarProps) {
  const t = useTranslations("session");
  const tPages = useTranslations("pages");
  const [codeCopied, setCodeCopied] = useState(false);

  function handleCopyCode() {
    void navigator.clipboard.writeText(sessionCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }

  return (
    <Popover.Root>
      <Popover.Trigger className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">{t("share")}</span>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8}>
          <Popover.Popup className="z-50 w-80 rounded-2xl border border-border bg-card p-5 shadow-xl">
            {/* Session code chip */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center">
                {t("sessionCode")}
              </p>
              <button
                onClick={handleCopyCode}
                className="w-full bg-muted/50 rounded-xl px-4 py-3 flex items-center justify-center gap-3 cursor-pointer hover:bg-muted transition-colors"
                aria-label={codeCopied ? t("copied") : t("sessionCode")}
              >
                <span className="font-mono text-3xl font-bold tracking-[0.2em] text-foreground text-center select-all">
                  {formatCode(sessionCode)}
                </span>
                {codeCopied ? (
                  <span className="text-xs font-semibold text-primary shrink-0">{t("copied")}</span>
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>
            </div>

            {/* QR code */}
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
