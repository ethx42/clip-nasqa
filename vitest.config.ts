import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        // @nasqa/core — pure TypeScript, node environment
        test: {
          name: "core",
          include: ["packages/core/src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        // @nasqa/functions — Lambda resolvers, node environment, AWS mocked
        test: {
          name: "functions",
          include: ["packages/functions/src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        // frontend — React components, jsdom, next-intl inlined
        plugins: [tsconfigPaths(), react()],
        test: {
          name: "frontend",
          include: ["packages/frontend/src/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["packages/frontend/src/__tests__/setup.ts"],
          server: {
            deps: {
              inline: ["next-intl"],
            },
          },
        },
      },
    ],
  },
});
