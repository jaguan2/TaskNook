import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

// Deliberately small: the recommended core rules, the react-hooks rules
// (which mechanically catch the stale-closure/missing-cleanup class of bug
// this codebase cares most about), and jsx-uses-vars so JSX usage counts as
// usage. Style/formatting is not linted.
export default [
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    plugins: { react, "react-hooks": reactHooks },
    rules: {
      // Just the two battle-tested hook rules. The plugin's full recommended
      // preset now bundles React-Compiler-era rules (set-state-in-effect,
      // refs) that reject patterns this React 18 codebase uses deliberately
      // (latest-value refs, reconciliation effects) — noise, not bugs.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react/jsx-uses-vars": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/**/*.test.js", "vite.config.js", "tailwind.config.js", "postcss.config.js", "eslint.config.js"],
    languageOptions: { globals: { ...globals.node } },
  },
];
