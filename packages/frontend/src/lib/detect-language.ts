/**
 * Client-safe module — no server imports.
 * Detects code language from content using multi-signal confidence heuristics.
 *
 * Design principle: only assign a language when confidence is HIGH (multiple signals).
 * Plain text, URLs, and casual prose always default to "text".
 */

export function detectLanguage(code: string): string {
  const trimmed = code.trim();

  // 1. Empty/whitespace
  if (!trimmed) return "text";

  // 2. URL detection — must come before YAML (https: prefix trips the YAML rule)
  const firstLine = trimmed.split("\n")[0]!.trim();
  if (/^https?:\/\//.test(firstLine)) return "text";

  // 3. JSON — starts with { or [ AND has a "key": value pattern
  if (/^\s*[\[{]/.test(trimmed) && /"[\w\s-]+"[\s]*:/.test(trimmed)) return "json";

  // 4. SQL — starts with a SQL keyword
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)\b/i.test(trimmed)) return "sql";

  // 5. HTML — has <tag> patterns AND does NOT start with {
  if (/<\/?[a-z][\w\s="'/-]*>/i.test(trimmed) && !/^\s*\{/.test(trimmed)) return "html";

  // 6. Python — specific Python-only signals
  if (
    /^\s*(def\s|class\s|if\s+__name__|async\s+def\s)/.test(trimmed) ||
    (/^\s*(import\s|from\s)/.test(trimmed) &&
      !/^\s*import\s*\(/.test(trimmed) &&
      /\n/.test(trimmed)) ||
    /^\s*print\s*\(/.test(trimmed)
  )
    return "python";

  // 7. Go — Go-specific signals
  if (/^\s*(package\s+\w+|func\s+\w+)/.test(trimmed) || /:=\s/.test(trimmed)) return "go";

  // 8. Rust — Rust-specific signals
  if (/^\s*(fn\s+\w+|let\s+mut\s|impl\s+\w+|use\s+std)/.test(trimmed)) return "rust";

  // 9. Java — Java-specific signals
  if (/^\s*(public\s+class\s|private\s+\w+\s+\w+|System\.out\.print)/.test(trimmed)) return "java";

  // 10. C++ — C++-specific signals
  if (
    /^\s*#include\s*[<"]/.test(trimmed) ||
    /\bint\s+main\s*\(/.test(trimmed) ||
    /\bstd::/.test(trimmed)
  )
    return "cpp";

  // 11. TypeScript — requires ALL THREE: (import/export/const/let/function/interface/type) AND ({}) AND (;, =>, or ": ")
  if (
    /\b(import\s|export\s|const\s|let\s|var\s|function\s|interface\s|type\s)/.test(trimmed) &&
    /[{}]/.test(trimmed) &&
    /(;|=>|:\s)/.test(trimmed)
  )
    return "typescript";

  // 12. YAML — starts with `word:` pattern, no {, no ;, no URL protocols
  if (
    /^\s*[\w-]+\s*:/.test(trimmed) &&
    !/{/.test(trimmed) &&
    !/;/.test(trimmed) &&
    !/^\s*\w+:\/\//.test(trimmed)
  )
    return "yaml";

  // 13. JavaScript — requires AT LEAST 2 of 3 signals: curly braces, statement semicolons, function/arrow/var keywords
  {
    let signals = 0;
    if (/[{}]/.test(trimmed)) signals++;
    if (/;\s*(\n|$)/.test(trimmed)) signals++;
    if (/\b(function\s|=>\s*\{|var\s)\b/.test(trimmed)) signals++;
    if (signals >= 2) return "javascript";
  }

  // 14. CSS — { and : and ; with property-value-like structure
  if (
    /{/.test(trimmed) &&
    /:/.test(trimmed) &&
    /;/.test(trimmed) &&
    /\b(color|margin|padding|font|background|border|display|width|height|position)\s*:/.test(
      trimmed,
    )
  )
    return "css";

  // 15. Bash — shebang or shell-specific patterns
  if (/^#!\s*\/bin\/(bash|sh)/.test(trimmed) || /\$\(/.test(trimmed) || /\$\{/.test(trimmed))
    return "bash";

  // 16. Default
  return "text";
}

export interface LanguageOption {
  value: string;
  label: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "rust", label: "Rust" },
  { value: "cpp", label: "C++" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "sql", label: "SQL" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "bash", label: "Bash" },
  { value: "text", label: "" },
];
