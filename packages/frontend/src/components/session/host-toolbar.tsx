"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { CopyButton } from "@/components/session/copy-button";
import { QRCodeClient } from "@/components/session/qr-code-client";

interface HostToolbarProps {
  participantUrl: string;
}

export function HostToolbar({ participantUrl }: HostToolbarProps) {
  const [open, setOpen] = useState(true);
  const t = useTranslations("pages");

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("hostControls")}
        </p>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="mt-3 flex flex-wrap items-start gap-6">
          <QRCodeClient url={participantUrl} size={100} />
          <div className="flex flex-1 flex-col justify-center gap-2">
            <p className="text-sm text-muted-foreground">{t("hostControlsDesc")}</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-1.5 font-mono text-xs text-foreground">
                {participantUrl}
              </code>
              <CopyButton value={participantUrl} label={t("copyUrl")} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
