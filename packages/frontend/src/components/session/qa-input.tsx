'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

const CHAR_LIMIT = 500;
const COUNTER_THRESHOLD = Math.floor(CHAR_LIMIT * 0.8); // 400

interface QAInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export function QAInput({ onSubmit, disabled = false }: QAInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea between 1-3 rows
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 24; // approx px per row
    const minHeight = lineHeight;
    const maxHeight = lineHeight * 3;
    el.style.height = `${Math.min(Math.max(el.scrollHeight, minHeight), maxHeight)}px`;
  }, [text]);

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > CHAR_LIMIT || disabled) return;
    onSubmit(trimmed);
    setText('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const isOverLimit = text.length > CHAR_LIMIT;
  const showCounter = text.length >= COUNTER_THRESHOLD;
  const canSubmit = text.trim().length > 0 && !isOverLimit && !disabled;

  return (
    <div className="border-t border-border bg-card px-4 py-3">
      <div className="flex items-end gap-2">
        <div className="relative min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            disabled={disabled}
            rows={1}
            style={{ resize: 'none', overflow: 'hidden' }}
            className={cn(
              'block w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50',
              isOverLimit && 'border-destructive focus:ring-destructive/50'
            )}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          aria-label="Send question"
          className="flex-shrink-0 rounded-xl bg-emerald-600 p-2 text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {showCounter && (
        <div className="mt-1.5 flex justify-end">
          <span
            className={cn(
              'text-xs tabular-nums',
              isOverLimit ? 'text-destructive font-semibold' : 'text-muted-foreground'
            )}
          >
            {text.length}/{CHAR_LIMIT}
          </span>
        </div>
      )}
    </div>
  );
}
