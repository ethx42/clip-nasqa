'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { detectLanguage, SUPPORTED_LANGUAGES } from '@/lib/detect-language';
import { renderHighlight, pushSnippetAction } from '@/actions/snippet';

interface HostInputProps {
  sessionSlug: string;
  hostSecretHash: string;
  onSnippetPushed?: () => void;
}

/**
 * Client Component — host snippet composer with:
 * - Auto-resize textarea
 * - Language auto-detection with manual override dropdown
 * - Live Shiki preview via Server Action (300ms debounced)
 * - Cmd/Ctrl+Enter to push, "Push Snippet" button
 * - Input clears immediately after push (optimistic)
 */
export function HostInput({ sessionSlug, hostSecretHash, onSnippetPushed }: HostInputProps) {
  const [value, setValue] = useState('');
  const [detectedLang, setDetectedLang] = useState('text');
  const [overrideLang, setOverrideLang] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeLang = overrideLang ?? detectedLang;

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 300)}px`;
  }, []);

  // Debounced live preview
  const schedulePreview = useCallback(
    (code: string, lang: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        if (!code.trim() || lang === 'text') {
          setPreviewHtml('');
          return;
        }
        const html = await renderHighlight(code, lang);
        setPreviewHtml(html);
      }, 300);
    },
    []
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      resizeTextarea();
      const detected = detectLanguage(newValue);
      setDetectedLang(detected);
      const lang = overrideLang ?? detected;
      schedulePreview(newValue, lang);
    },
    [overrideLang, resizeTextarea, schedulePreview]
  );

  const handleLangSelect = useCallback(
    (lang: string) => {
      setOverrideLang(lang === detectedLang ? null : lang);
      setShowLangDropdown(false);
      schedulePreview(value, lang);
    },
    [detectedLang, value, schedulePreview]
  );

  const handlePush = useCallback(async () => {
    const content = value.trim();
    if (!content || isPushing) return;
    setIsPushing(true);
    // Clear immediately (optimistic)
    setValue('');
    setPreviewHtml('');
    setDetectedLang('text');
    setOverrideLang(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    const lang = activeLang;
    const type = lang !== 'text' ? 'code' : 'text';
    await pushSnippetAction({
      sessionSlug,
      hostSecretHash,
      content,
      type,
      language: lang !== 'text' ? lang : undefined,
    });
    setIsPushing(false);
    onSnippetPushed?.();
  }, [value, isPushing, activeLang, sessionSlug, hostSecretHash, onSnippetPushed]);

  // Keyboard shortcut: Cmd/Ctrl + Enter
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        void handlePush();
      }
    },
    [handlePush]
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowLangDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 p-4">
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Paste or type code/text..."
        rows={3}
        className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
        style={{ minHeight: '72px', maxHeight: '300px' }}
      />

      {/* Controls row */}
      <div className="flex items-center justify-between gap-2">
        {/* Language chip + dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowLangDropdown((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent transition"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {SUPPORTED_LANGUAGES.find((l) => l.value === activeLang)?.label ?? activeLang}
            {overrideLang && (
              <span className="ml-0.5 text-muted-foreground">(manual)</span>
            )}
          </button>
          {showLangDropdown && (
            <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-40 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => handleLangSelect(lang.value)}
                  className={`w-full px-3 py-1.5 text-left text-xs hover:bg-accent transition ${
                    activeLang === lang.value
                      ? 'font-medium text-emerald-600 dark:text-emerald-400'
                      : 'text-foreground'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Push button */}
        <button
          type="button"
          onClick={() => void handlePush()}
          disabled={!value.trim() || isPushing}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          {isPushing ? 'Pushing...' : 'Push Snippet'}
          <kbd className="ml-1 hidden rounded bg-white/20 px-1 text-xs sm:inline">
            ⌘↵
          </kbd>
        </button>
      </div>

      {/* Live preview */}
      {previewHtml && (
        <div
          className="max-h-48 overflow-y-auto overflow-x-auto rounded-lg border border-border bg-background p-2 text-sm"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      )}
    </div>
  );
}
