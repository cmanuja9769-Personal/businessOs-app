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
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "warn",

      "max-depth": ["warn", 6],
      "no-nested-ternary": "warn",

      "sonarjs/cognitive-complexity": "off",
      "sonarjs/no-duplicate-string": "off",
      "sonarjs/no-identical-functions": "warn",
      "sonarjs/no-collapsible-if": "warn",
      "sonarjs/prefer-immediate-return": "off",
      "sonarjs/no-nested-template-literals": "off",
      "sonarjs/no-empty-collection": "off",
      "sonarjs/no-ignored-exceptions": "warn",
      "sonarjs/no-nested-conditional": "warn",
    },
  }
);
