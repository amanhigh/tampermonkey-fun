/**
 * npm install --save-dev 
 * npx eslint --init
 * npx eslint .
 */
import globals from "globals";

export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "script",
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,        // Includes setTimeout, setInterval, requestAnimationFrame, etc.
        ...globals.greasemonkey,   // TamperMonkey/GreaseMonkey globals
        ...globals.jquery,         // jQuery globals ($, jQuery)
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error"
    }
  }
];