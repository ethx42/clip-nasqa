export default {
  "packages/frontend/**/*.{ts,tsx}": [
    "eslint --fix --config packages/frontend/eslint.config.mjs --no-warn-ignored",
    "prettier --write",
  ],
  "packages/{core,functions}/**/*.ts": ["prettier --write"],
  "**/*.{json,md,css,yml}": ["prettier --write"],
};
