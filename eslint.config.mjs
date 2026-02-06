import path from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";
import sonarjs from "eslint-plugin-sonarjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/build/**",
      "**/dist/**",
      "**/supabase/functions/**",
      "**/.git/**",
      "**/public/**",
    ],
  },
  // Next.js core-web-vitals: enforces next/image, next/link, hook deps, etc.
  ...compat.extends("next/core-web-vitals"),
  // SonarJS recommended rules for code quality
  sonarjs.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    extends: [
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // --- TypeScript quality ---
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      // --- General code quality ---
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "warn",

      // --- Cognitive complexity & code-smell reduction ---
      "max-depth": ["warn", 4],
      "no-nested-ternary": "warn",

      // --- SonarJS rules (override to warn instead of error) ---
      "sonarjs/cognitive-complexity": ["warn", 15],
      "sonarjs/no-duplicate-string": ["warn", { threshold: 3 }],
      "sonarjs/no-identical-functions": "warn",
      "sonarjs/no-collapsible-if": "warn",
      "sonarjs/prefer-immediate-return": "warn",
      "sonarjs/no-nested-template-literals": "warn",
    },
  }
);
