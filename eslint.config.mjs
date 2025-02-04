/**
 * npm install --save-dev 
 * npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin
 * npx eslint --init
 * npx eslint .
 */
// eslint.config.mjs
import globals from "globals";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";

export default [
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: "./tsconfig.json",
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        ...globals.greasemonkey,
        ...globals.jquery,
      }
    },
    plugins: {
      "@typescript-eslint": typescript
    },
    rules: {
      ...typescript.configs["recommended"].rules,
      
      // Keep only TypeScript-specific rules that add value beyond tsconfig
      "@typescript-eslint/no-unused-vars": ["error", {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_"
      }],
      "no-unused-private-class-members": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/prefer-as-const": "warn",
      "@typescript-eslint/prefer-readonly": "warn",
      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/no-explicit-any": ["error", {
          "fixToUnknown": true
        }],
      "@typescript-eslint/promise-function-async": "error",
      
      // Code quality rules
      "max-lines": ["warn", 200],
      "max-lines": ["error", 500],
      "max-lines-per-function": ["warn", 50],
      "complexity": ["warn", 10],
      "max-depth": ["warn", 3],
      "max-nested-callbacks": ["warn", 3],
      "max-params": ["warn", 6],
      
      // Essential style rules
      "linebreak-style": ["error", "unix"],
      "semi": ["error", "always"],
      "no-multiple-empty-lines": ["error", { "max": 1 }],
      // "no-trailing-spaces": "error",
      "eol-last": "error",
      
      // Runtime behavior rules
      "eqeqeq": "error",
      "no-var": "error",
      "prefer-const": "warn",
      // "no-console": "warn",
      "curly": "warn"
    }
  }
];