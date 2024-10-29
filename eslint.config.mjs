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
        // Only browser and jQuery globals
        window: true,
        document: true,
        $: true,
        jQuery: true,

        // Only globals that are used in the code
        "requestAnimationFrame": true,
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error"
    }
  }
];