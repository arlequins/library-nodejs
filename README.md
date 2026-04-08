# @arlequins/library-nodejs

A [Lerna](https://lerna.js.org/) monorepo publishing **@arlequins** scoped npm packages with **independent** versioning (`version: "independent"` in `lerna.json`).

## Requirements

- **Node.js ≥ 24.x** (see root `.nvmrc`, currently `24`)

## Packages

| Package | Description |
|---------|-------------|
| [@arlequins/oauth2](packages/oauth2/) | Express middleware around [`@node-oauth/oauth2-server`](https://www.npmjs.com/package/@node-oauth/oauth2-server); Drizzle (PostgreSQL) `createDrizzleOAuthModels`, JWT-oriented `createJwtOAuthModels`, token/scope helpers |
| [@arlequins/oauth2-drizzle](packages/oauth2-drizzle/) | Drizzle schema for OAuth tables; `createOAuthDb` builds `pg` pool + Drizzle `db` from **explicit options only** (no `process.env` reads in this package) |
| [@arlequins/utils](packages/utils/) | Small shared utilities (dayjs date helpers, recursive object key snake/camelCase) |
| [@arlequins/common-config](packages/common-config/) | Shared **lint-staged**, **Prettier**, and **Jest** configs |
| [@arlequins/eslint-config-typescript](packages/eslint-config-typescript/) | ESLint 9+ flat config for TypeScript (typescript-eslint, Prettier, import, SonarJS) |

Published packages: search [npmjs.com](https://www.npmjs.com/) by name; `repository.directory` in each `package.json` points at this repo layout.

## Local development

There is no npm workspace at the repo root—install and build **per package**:

```sh
nvm use   # Node 24
cd packages/oauth2-drizzle && npm ci && npm run build
cd ../oauth2 && npm ci && npm run build
# Repeat for utils, common-config, eslint-config-typescript as needed
```

`@arlequins/oauth2` lists `@arlequins/oauth2-drizzle` under `devDependencies` as `file:../oauth2-drizzle` for local adapter work.

## Releases

`lerna.json` is set up for **conventional commits** and publishing/versioning from the **`main`** branch. Follow your team’s release process for `lerna publish` / `lerna version`.

## License

MIT (see `license` in each package’s `package.json`)
