"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { IdentityEditor } from "@/components/session/identity-editor";

interface SessionShellProps {
  title: string;
  isHost?: boolean;
  sessionSlug?: string;
  clipboardSlot: React.ReactNode;
  qaSlot: React.ReactNode;
  hostToolbar?: React.ReactNode;
  liveIndicator?: React.ReactNode;
  /** Current snippet count — used for mobile tab badge. */
  snippetCount?: number;
  /** Current question count — used for mobile tab badge. */
  questionCount?: number;
}

type Tab = "clipboard" | "qa";

export function SessionShell({
  title,
  isHost = false,
  clipboardSlot,
  qaSlot,
  hostToolbar,
  liveIndicator,
  snippetCount = 0,
  questionCount = 0,
}: SessionShellProps) {
  void isHost;
  const t = useTranslations("session");
  const [activeTab, setActiveTab] = useState<Tab>("clipboard");

  // Track the count each tab last "saw" when it was active (useState so render can read it)
  const [lastSeenSnippets, setLastSeenSnippets] = useState(snippetCount);
  const [lastSeenQuestions, setLastSeenQuestions] = useState(questionCount);

  // When switching tabs, mark the newly active tab as "seen"
  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    if (tab === "clipboard") {
      setLastSeenSnippets(snippetCount);
    } else {
      setLastSeenQuestions(questionCount);
    }
  }

  // Keep the active tab's "seen" count up to date
  useEffect(() => {
    if (activeTab === "clipboard") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastSeenSnippets(snippetCount);
    }
  }, [activeTab, snippetCount]);

  useEffect(() => {
    if (activeTab === "qa") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastSeenQuestions(questionCount);
    }
  }, [activeTab, questionCount]);

  const clipboardBadge = activeTab !== "clipboard" && snippetCount > lastSeenSnippets;
  const qaBadge = activeTab !== "qa" && questionCount > lastSeenQuestions;

  return (
    <div className="flex h-[calc(100dvh-53px)] flex-col">
      {/* Session header */}
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-center gap-3">
          <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {liveIndicator}
          <div className="ml-auto">
            <IdentityEditor />
          </div>
        </div>
      </div>

      {/* Optional host toolbar */}
      {hostToolbar && <div className="border-b border-border px-6 py-3">{hostToolbar}</div>}

      {/* Mobile tab bar (hidden on lg+) */}
      <div className="flex border-b border-border lg:hidden">
        <button
          onClick={() => handleTabChange("clipboard")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "clipboard"
              ? "border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("clipboard")}
          {clipboardBadge && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
        </button>
        <button
          onClick={() => handleTabChange("qa")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "qa"
              ? "border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("qa")}
          {qaBadge && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
        </button>
      </div>

      {/* Content area */}
      <div className="flex min-h-0 flex-1 p-5 lg:p-6">
        {/* Desktop: two-column grid */}
        <div className="hidden w-full gap-5 lg:grid lg:grid-cols-2 lg:gap-6">
          <div className="flex min-h-0 flex-col gap-3">
            <h2 className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground/70">
              {t("clipboard")}
            </h2>
            {clipboardSlot}
          </div>
          <div className="flex min-h-0 flex-col gap-3">
            <h2 className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground/70">
              {t("qa")}
            </h2>
            {qaSlot}
          </div>
        </div>

        {/* Mobile: single panel based on active tab */}
        <div className="flex w-full lg:hidden">
          {activeTab === "clipboard" ? clipboardSlot : qaSlot}
        </div>
      </div>
    </div>
  );
}
