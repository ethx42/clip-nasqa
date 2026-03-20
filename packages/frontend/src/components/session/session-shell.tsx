"use client";

import { ChevronDown, ChevronRight, ClipboardList, MessageCircleQuestion } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

interface SessionShellProps {
  isHost?: boolean;
  sessionCode?: string;
  clipboardSlot: React.ReactNode;
  qaSlot: React.ReactNode;
  snippetCount?: number;
  questionCount?: number;
  /** When true, the Q&A section header becomes a toggle on desktop. Default: false. */
  allowCollapseQA?: boolean;
}

type Tab = "clipboard" | "qa";

export function SessionShell({
  clipboardSlot,
  qaSlot,
  snippetCount = 0,
  questionCount = 0,
  allowCollapseQA = false,
}: SessionShellProps) {
  const t = useTranslations("session");
  const [activeTab, setActiveTab] = useState<Tab>("clipboard");
  const [qaCollapsed, setQaCollapsed] = useState(false);

  const [lastSeenSnippets, setLastSeenSnippets] = useState(snippetCount);
  const [lastSeenQuestions, setLastSeenQuestions] = useState(questionCount);

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    if (tab === "clipboard") {
      setLastSeenSnippets(snippetCount);
    } else {
      setLastSeenQuestions(questionCount);
    }
  }

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
    <div className="flex h-[calc(100dvh-var(--header-height))] flex-col">
      {/* Mobile tab bar */}
      <nav aria-label={t("sessionPanels")} className="flex border-b border-border lg:hidden">
        <button
          onClick={() => handleTabChange("clipboard")}
          aria-label={t("clipboard")}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
            activeTab === "clipboard"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ClipboardList className="h-4 w-4" aria-hidden="true" />
          {t("clipboard")}
          {clipboardBadge && (
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
          )}
        </button>
        <button
          onClick={() => handleTabChange("qa")}
          aria-label={t("qa")}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
            activeTab === "qa"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
          {t("qa")}
          {qaBadge && (
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
          )}
        </button>
      </nav>

      {/* Content */}
      <div className="min-h-0 flex-1 p-4 lg:p-5">
        {/* Desktop: two columns (flex-based for smooth collapse) */}
        <div className="hidden h-full gap-5 lg:flex">
          {/* Clipboard section — always visible, expands when Q&A collapsed */}
          <section
            aria-label={t("clipboard")}
            className="flex min-h-0 flex-1 flex-col transition-all duration-200"
          >
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("clipboard")}
            </h2>
            {clipboardSlot}
          </section>

          {/* Q&A section — collapsible when allowCollapseQA is true */}
          <section
            aria-label={t("qa")}
            className={`flex min-h-0 flex-col transition-all duration-200 ${
              allowCollapseQA && qaCollapsed ? "w-auto flex-none" : "flex-1"
            }`}
          >
            {allowCollapseQA ? (
              <button
                onClick={() => setQaCollapsed((v) => !v)}
                aria-expanded={!qaCollapsed}
                className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
              >
                {qaCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                {t("qa")}
                {qaCollapsed && questionCount > 0 && (
                  <span className="text-xs tabular-nums">({questionCount})</span>
                )}
              </button>
            ) : (
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t("qa")}
              </h2>
            )}
            {(!allowCollapseQA || !qaCollapsed) && (
              <div className="min-h-0 flex-1 overflow-hidden">{qaSlot}</div>
            )}
          </section>
        </div>

        {/* Mobile: single panel */}
        <section
          aria-label={activeTab === "clipboard" ? t("clipboard") : t("qa")}
          className="flex h-full w-full lg:hidden"
        >
          {activeTab === "clipboard" ? clipboardSlot : qaSlot}
        </section>
      </div>
    </div>
  );
}
