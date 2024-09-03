module.exports = [
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: require("@typescript-eslint/parser"),
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin')
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
    }
  },
  {
    ignores: ["node_modules/", ".idea/", "**/.DS_STORE", "artifacts/", "cache/", "@types/generated/", "yarn-error.log"]
  },
];
