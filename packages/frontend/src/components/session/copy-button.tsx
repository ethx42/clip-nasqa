"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const t = useTranslations("session");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      aria-label={label}
      className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-indigo-500" />
          {t("copied")}
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          {label}
        </>
      )}
    </button>
  );
}
