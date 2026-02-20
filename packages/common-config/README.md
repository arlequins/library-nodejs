# @arlequins/common-config

Shared configuration for Node.js/TypeScript projects: **lint-staged**, **Prettier**, and **Jest**. Use these configs as a base and extend or override them in your project.

**Requirements:** Node.js >= 22.x

## Installation

```sh
npm install @arlequins/common-config --save-dev
```

Install the peer dependencies used by these configs:

```sh
npm install @types/jest jest ts-jest ts-node lint-staged husky --save-dev
```

## Usage

The package exports three configs: `lintstagedrc`, `prettierrc`, and `jestrc`. Require them from `@arlequins/common-config` and use or merge them in your project config files.

### Lint-staged

Use in `.lintstagedrc.cjs` or your `package.json` lint-staged section:

```js
module.exports = require('@arlequins/common-config').lintstagedrc;
```

Or merge with your own rules:

```js
const { lintstagedrc } = require('@arlequins/common-config');
module.exports = {
  ...lintstagedrc,
  '*.md': ['prettier --write'],
};
```

**Default behavior:** runs Prettier on `*.js`/`*.ts`, and ESLint + Jest on `*.ts`.

### Prettier

Use in `.prettierrc.cjs` or `prettier.config.cjs`:

```js
module.exports = require('@arlequins/common-config').prettierrc;
```

**Included options:** `trailingComma: 'es5'`, `singleQuote: true`, `printWidth: 400`, `tabWidth: 2`, `semi: true`, `endOfLine: 'lf'`, and related formatting options.

### Jest

Use in `jest.config.cjs` (or merge into your existing Jest config):

```js
module.exports = require('@arlequins/common-config').jestrc;
```

**Included:** `ts-jest` preset, `node` test environment, `**/*.spec.ts` test match, coverage ignore patterns, and path aliases (`@functions`, `@libs`, `@settings`, `@typing`, `@constants`, `@tests`). It also expects a setup file at `<rootDir>/src/tests/utils/jest-mock-common.ts`.

If your project structure differs, extend and override:

```js
const { jestrc } = require('@arlequins/common-config');
module.exports = {
  ...jestrc,
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    ...jestrc.moduleNameMapper,
    '@/(.*)': '<rootDir>/src/$1',
  },
};
```

## Peer dependencies

| Package       | Purpose              |
|--------------|----------------------|
| `jest`       | Test runner          |
| `ts-jest`    | TypeScript for Jest  |
| `@types/jest`| Jest types           |
| `ts-node`    | Run TS in Node       |
| `lint-staged`| Pre-commit linting   |
| `husky`      | Git hooks            |

## License

MIT
