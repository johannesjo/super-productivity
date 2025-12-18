/**
 * Local ESLint rules for Super Productivity.
 *
 * These rules are loaded by eslint-plugin-local-rules.
 * Usage in .eslintrc.json:
 *   "plugins": ["local-rules"],
 *   "rules": { "local-rules/require-hydration-guard": "warn" }
 */
module.exports = {
  'require-hydration-guard': require('./rules/require-hydration-guard'),
};
