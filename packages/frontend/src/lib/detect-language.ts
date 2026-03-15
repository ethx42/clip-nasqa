/**
 * Client-safe module — no server imports.
 * Detects code language from content using simple regex heuristics.
 */

export function detectLanguage(code: string): string {
  const trimmed = code.trim();
  if (!trimmed) return 'text';
  if (
    /^\s*(import\s|from\s|export\s|const\s|let\s|var\s|function\s|class\s|interface\s|type\s|=>)/.test(
      trimmed
    ) &&
    /[{}]/.test(trimmed)
  )
    return 'typescript';
  if (
    /^\s*(def\s|import\s|from\s|class\s|if\s+__name__|print\()/.test(trimmed)
  )
    return 'python';
  if (/^\s*(func\s|package\s|import\s*\(|:=\s)/.test(trimmed)) return 'go';
  if (/^\s*(public\s+class|private\s|System\.out)/.test(trimmed)) return 'java';
  if (/^\s*#include\s|int\s+main\s*\(|std::/.test(trimmed)) return 'cpp';
  if (/<\/?[a-z][\s\S]*>/i.test(trimmed) && !/^\s*\{/.test(trimmed))
    return 'html';
  if (/^\s*\{[\s\S]*"[\w]+"[\s\S]*:/.test(trimmed)) return 'json';
  if (
    /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(trimmed)
  )
    return 'sql';
  if (/^\s*[\w-]+\s*:/.test(trimmed) && !/{/.test(trimmed)) return 'yaml';
  if (/^\s*(fn\s|let\s+mut|impl\s|use\s+std)/.test(trimmed)) return 'rust';
  if (/[{;]/.test(trimmed) && /\w+\s*\(/.test(trimmed)) return 'javascript';
  return 'text';
}

export interface LanguageOption {
  value: string;
  label: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
  { value: 'java', label: 'Java' },
  { value: 'rust', label: 'Rust' },
  { value: 'cpp', label: 'C++' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'bash', label: 'Bash' },
  { value: 'text', label: '' },
];
