# Coding Conventions

**Analysis Date:** 2026-03-13

## Naming Patterns

**Files:**
- PascalCase for React components: `button.tsx`, `layout.tsx`, `page.tsx`
- camelCase for utility files: `utils.ts`, `schemas.ts`, `types.ts`, `i18n.ts`
- camelCase for resolver functions: `example.ts` (AWS Lambda resolvers)
- Index files use barrel export pattern: `index.ts`

**Functions:**
- camelCase for regular functions: `cn()`, `handler()`, `baseSchema()`
- PascalCase for React components: `Button()`, `RootLayout()`, `Home()`
- Exported constants follow camelCase: `buttonVariants`, `baseSchema`, `i18nKeys`

**Variables:**
- camelCase for local variables: `geistSans`, `geistMono`, `className`
- CONST_CASE for const objects/configuration: `i18nKeys` (used as const)
- Boolean variables use semantic naming: `disabled`, `aria-invalid`

**Types:**
- PascalCase for interfaces and type definitions: `AppSyncContext`, `ClassValue`, `VariantProps`, `BaseEntity`, `I18nKey`
- Suffix `Props` for component prop types: `ButtonPrimitive.Props`, `VariantProps`
- Inferred types from Zod use lowercase prefix: `BaseEntity` from `baseSchema`

## Code Style

**Formatting:**
- ESLint configured with Next.js preset (`eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`)
- No explicit Prettier config found; inferred style from codebase:
  - 2-space indentation
  - Single quotes preferred for imports: `import { clsx, type ClassValue } from "clsx"`
  - Space around object properties in type definitions
  - Line breaks between import groups

**Linting:**
- ESLint 9.x configured via `eslint.config.mjs` (flat config format)
- Run linting with: `npm run lint --workspace=packages/frontend`
- Configuration: `packages/frontend/eslint.config.mjs`

## Import Organization

**Order:**
1. External dependencies (Node.js and npm packages): `import { clsx, type ClassValue } from "clsx"`
2. React and framework imports: `import type { Metadata } from "next"`, `import { Button as ButtonPrimitive } from "@base-ui/react/button"`
3. Local imports (path aliases or relative): `import { cn } from "@/lib/utils"`, `import type { AppSyncContext } from "@nasqa/core"`
4. Blank line before const definitions

**Path Aliases:**
- `@/*` → `packages/frontend/src/*` (frontend package)
- `@nasqa/core` → `packages/core/src` (shared core package)
- `@nasqa/core/*` → `packages/core/src/*` (core exports)

**Import Style:**
- Use named imports: `import { Button as ButtonPrimitive }`
- Use `type` keyword for type-only imports: `import type { ClassValue } from "clsx"`, `import type { VariantProps }`
- Use default exports for single exports: `export default function Home() {}`
- Use named exports for utility functions: `export function cn(...inputs: ClassValue[]) {}`

## Error Handling

**Patterns:**
- No try/catch blocks found in codebase; errors handled at framework level (Next.js, AWS Lambda)
- Async handlers return structured responses: `{ statusCode: 200, body: JSON.stringify(...) }`
- Zod schema validation (`schemas.ts`) provides type-safe validation with built-in error handling
- No custom error classes defined; rely on framework error handling

## Logging

**Framework:** Console not used in traced files. Logging deferred to runtime environment or monitoring services.

**Patterns:**
- No logging statements found in source code
- Async handlers (`packages/functions/src/resolvers/example.ts`) return structured data for CloudWatch integration

## Comments

**When to Comment:**
- Comments minimal in codebase; code clarity preferred over documentation
- Only comment on non-obvious intent (seen in: SST config comments)
- Module-level comments only at top: `// AWS Lambda handlers for AppSync resolvers`

**JSDoc/TSDoc:**
- Not used in current codebase
- TypeScript strict mode and type annotations provide inline documentation
- Interface definitions are self-documenting

## Function Design

**Size:** Small, focused functions. Utility functions are 1-6 lines. Components are 3-65 lines.

**Parameters:**
- Use object destructuring for component props: `function Button({ className, variant = "default", size = "default", ...props }: ...)`
- Spread operator for remaining props: `...props` passed to underlying component
- Default parameters for variant values: `variant = "default"`, `size = "default"`

**Return Values:**
- React components return JSX.Element
- Utilities return directly: `return twMerge(clsx(inputs))`
- Handlers return objects with `statusCode` and `body`

## Module Design

**Exports:**
- Barrel exports pattern in index files: `export * from "./schemas"`, `export * from "./types"`
- Export functions and components together: `export { Button, buttonVariants }`
- Named exports preferred: `export function cn(...) {}`, `export const i18nKeys = {...}`
- Default exports for route components: `export default function Home() {}`

**Barrel Files:**
- Used in `packages/core/src/index.ts` to aggregate exports
- Used in `packages/functions/src/index.ts` to export Lambda handlers
- Not used at folder level (no `components/index.ts`)

**Directory Structure:**
- Flat structure for small components: `components/ui/button.tsx`
- Flat structure for utilities: `lib/utils.ts`
- Flat structure for services: `src/lib/`, `src/components/`, `src/app/`

---

*Convention analysis: 2026-03-13*
