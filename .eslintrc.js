module.exports = {
  env: {
    node: true,
    es2021: true
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ["tsconfig.json"],
  },
  plugins: [
    '@typescript-eslint', "import"
  ],

  rules: {
      quotes: ["error", "double"]
  }
}
