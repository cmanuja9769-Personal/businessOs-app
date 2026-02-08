import tseslint from "typescript-eslint";
import sonarjs from "eslint-plugin-sonarjs";
import nextConfig from "eslint-config-next/core-web-vitals";

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
  ...nextConfig,
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
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",

      "max-depth": ["error", 4],
      "no-nested-ternary": "error",

      "sonarjs/cognitive-complexity": ["warn", 10],
      "sonarjs/no-duplicate-string": ["warn", { threshold: 3 }],
      "sonarjs/no-identical-functions": "error",
      "sonarjs/no-collapsible-if": "error",
      "sonarjs/prefer-immediate-return": "off",
      "sonarjs/no-nested-template-literals": "off",
      "sonarjs/no-empty-collection": "warn",
      "sonarjs/no-ignored-exceptions": "error",
      "sonarjs/no-nested-conditional": "error",
    },
  }
);
