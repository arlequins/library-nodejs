# @arlequins/eslint-config-typescript

Shared ESLint configuration for TypeScript. Built on the flat config (`eslint.config.js`) and includes TypeScript, Prettier, Import, and SonarJS rules.

**Requirements:** Node.js >= 22.x, ESLint 9+

## Installation

Install the config in your project:

```sh
npm install @arlequins/eslint-config-typescript --save-dev
```

This config uses the following packages as **peer dependencies**, so they must be installed in your project as well:

```sh
npm install eslint typescript-eslint eslint-config-prettier eslint-plugin-prettier eslint-plugin-import eslint-import-resolver-typescript eslint-plugin-sonarjs globals prettier --save-dev
```

## Usage

Create `eslint.config.js` (or `eslint.config.mjs`) at your project root and extend this config:

```js
const config = require('@arlequins/eslint-config-typescript');

module.exports = [...config];
```

To add or override rules, append more config objects to the array:

```js
const config = require('@arlequins/eslint-config-typescript');

module.exports = [
  ...config,
  {
    rules: {
      // Project-specific rule overrides
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
];
```

## Included

- **typescript-eslint** recommended rules
- **eslint-config-prettier** (disables rules that conflict with Prettier)
- **eslint-plugin-prettier** (runs Prettier as an ESLint rule)
- **eslint-plugin-import** (static analysis for import/export)
- **eslint-plugin-sonarjs** (code smell and bug detection)
- Node / Jest globals
- Ignores `**/node_modules`, `**/coverage`, `**/mocks`

## License

MIT
