module.exports = {
  root: true,
  env: { es2021: true, node: true, browser: true },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: "./tsconfig.json",
  },
  plugins: [
    "@typescript-eslint",
    "react",
    "react-hooks",
    "import",
    "unused-imports",
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:prettier/recommended",
  ],
  settings: {
    react: { version: "detect" },
    "import/resolver": { typescript: true },
  },
  rules: {
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "unused-imports/no-unused-imports": "warn",
    "import/order": [
      "warn",
      {
        groups: [
          ["builtin", "external"],
          "internal",
          ["parent", "sibling", "index"],
        ],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
    "@typescript-eslint/no-explicit-any": ["warn", { ignoreRestArgs: true }],
    "@typescript-eslint/consistent-type-imports": "warn",
    // Relax strict runtime-safety rules to reduce noise for RN/external libs
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint/no-unsafe-argument": "off",
    "@typescript-eslint/no-unsafe-return": "off",
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/no-misused-promises": [
      "warn",
      { checksVoidReturn: false },
    ],
    "@typescript-eslint/no-unnecessary-type-assertion": "warn",
    // Allow underscore prefix as unused
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/no-floating-promises": "warn",
    "no-empty": "warn",
    // Treat Prettier formatting as warnings, not errors
    "prettier/prettier": "warn",
    "react/display-name": "off",
    "@typescript-eslint/require-await": "warn",
    "@typescript-eslint/no-redundant-type-constituents": "warn",
    "react/prop-types": "off",
  },
  ignorePatterns: [
    "node_modules/",
    "dist/",
    "web-build/",
    "android/",
    "ios/",
    "scripts/",
    "**/__tests__/**",
  ],
};
