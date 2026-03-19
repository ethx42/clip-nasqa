"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { IconButton } from "@/components/ui/icon-button";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <IconButton tooltip={label} onClick={handleCopy}>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-indigo-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </IconButton>
  );
}
