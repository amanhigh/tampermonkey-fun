/**
 * npm install --save-dev 
 * npx eslint --init
 * npx eslint .
 */
import globals from "globals";

export default [
  {
    files: ["**/*.js", "lib/**/*.js"],
    languageOptions: {
      sourceType: "script",
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.greasemonkey,
      },
    },
    rules: {
      "no-unused-vars": ["warn", {
        "vars": "all",
        "args": "after-used",
        "ignoreRestSiblings": false,
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      "no-undef": "warn",
      "no-global-assign": "error",
    }
  }
];