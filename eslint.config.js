const globals = require("globals");

module.exports = [
  {
    ignores: [
      "**/node_modules/**",
      "**/.git/**",
      "Backend/node_modules/**",
      "Home_page/**/*.png",
      "*.png",
    ],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
    },
  },
];

