// @ts-check
import eslint from "@eslint/js"
import tseslint from "typescript-eslint"

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
        sourceType: "module",
      },
    },
  },
  {
    files: ["./**/__tests__/*.ts{x,}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  }
)
