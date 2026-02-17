import globals from "globals";
import pluginJs from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {files: ["**/*.js"], languageOptions: {sourceType: "commonjs"}},
  {languageOptions: { globals: {...globals.node, ...globals.vitest} }},
  pluginJs.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "caughtErrorsIgnorePattern": "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }]
    }
  }
];
