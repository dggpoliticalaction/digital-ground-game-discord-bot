import js from "@eslint/js"
import tseslint from "typescript-eslint"

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: true
      }
    },
    rules: {
      // Enforce consistent code style
      quotes: ["error", "single", { avoidEscape: true }],
      semi: ["error", "always"],
      "comma-dangle": ["error", "always-multiline"],

      // Stolen from org-repo
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/no-empty-function": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-shadow": "error",
      "@typescript-eslint/no-use-before-define": "error",
      "@typescript-eslint/no-var-requires": "error",
      "@typescript-eslint/prefer-ts-expect-error": "error",
    }
  }
]
