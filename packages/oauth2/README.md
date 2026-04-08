# @arlequins/oauth2

Express middleware and helpers around [`@node-oauth/oauth2-server`](https://www.npmjs.com/package/@node-oauth/oauth2-server).

## What is generic vs. reference-only

| Area | Role |
|------|------|
| `ExpressOAuthServer`, `createTokenSettings`, `oauthClientFromRow`, `verifyAccessTokenScopes` | Reusable for any app; wire your own OAuth `model` implementation or use the Drizzle adapters below. |
| `createDrizzleOAuthModels` | **Reference** Drizzle + PostgreSQL adapter. Requires `@arlequins/oauth2-drizzle` (`oauthSchema` tables) and a `NodePgDatabase` (e.g. from `createOAuthDb` in that package). You must pass **`options.getUser`** (password grant). |
| `createJwtOAuthModels` | **Reference** Drizzle + PostgreSQL model bundle oriented around JWT flows; requires the same Drizzle DB + schema. You supply `getUser`, `getAccessToken`, `saveToken`, and optional hooks (`fetchUserInfo`, `createNewUser`, etc.) typed via `JwtOAuthModelHooks` / `CreateJwtOAuthModelsOptions`. |

## Peer dependencies

- **Express** (middleware): `express`
- **Drizzle model** (optional): `drizzle-orm`, `pg`, `@arlequins/oauth2-drizzle` — install when you use `createDrizzleOAuthModels`.

```sh
npm install @arlequins/oauth2 @arlequins/oauth2-drizzle drizzle-orm pg express
```

`@arlequins/oauth2-drizzle`, `drizzle-orm`, and `pg` are optional peers if you only use the middleware with a custom `model`.

## Public exports

The package entry (`@arlequins/oauth2`) exports:

- `ExpressOAuthServer`, `ExpressOAuthServerOptions`, `ExpressOAuthServerAddition`
- `createDrizzleOAuthModels`, `CreateOAuthModelsOptions`
- `createJwtOAuthModels`, `CreateJwtOAuthModelsOptions`, `JwtOAuthModelHooks`
- `createTokenSettings`
- `oauthClientFromRow`, `verifyAccessTokenScopes`
- OAuth-related TypeScript types (via `export type *` from `./oauth-types`, e.g. `OAuthModelBundle`, `ReturnOAuthClient`)

## Usage

### Drizzle model bundle (`createDrizzleOAuthModels`)

Use a Drizzle `db` built with `oauthSchema` from `@arlequins/oauth2-drizzle` (see that package for `createOAuthDb`).

```javascript
import { ExpressOAuthServer, createDrizzleOAuthModels } from '@arlequins/oauth2';
import { createOAuthDb } from '@arlequins/oauth2-drizzle';

const { db, pool } = createOAuthDb({
  connectionString: process.env.DATABASE_URL,
});
const oauthModels = createDrizzleOAuthModels(db, {
  getUser: async (username, password, client) => {
    // Return an OAuth user object or `false`
  },
});

router.oauth = new ExpressOAuthServer({
  model: oauthModels,
  grants: ['password', 'refresh_token'],
});
```

### Middleware options

- **`passwordGrantPasswordValidation`** (optional `RegExp` or `null`): If set, runs **before** the OAuth2 server handles `grant_type=password`. If the password string does not match the regex, the handler returns `400` with a fixed error body. Omit or set to `null` to skip this check and validate credentials only in `getUser`.

```javascript
router.oauth = new ExpressOAuthServer({
  model: oauthModels,
  grants: ['password', 'refresh_token'],
  passwordGrantPasswordValidation: /.{8,}/, // example: minimum length
});
```

### Token settings (`createTokenSettings`)

Builds `TokenOptions`-compatible settings. **`isDevelop`** selects shorter default lifetimes when you do not pass explicit `accessTokenLifetime` / `refreshTokenLifetime`:

- `isDevelop: true`: defaults roughly **2 minutes** (access) and **2 hours** (refresh).
- `isDevelop: false` (default): defaults roughly **30 minutes** (access) and **12 hours** (refresh).

Explicit `accessTokenLifetime` / `refreshTokenLifetime` always win over those defaults.

```javascript
router.post(`/oauth/token`, router.oauth.token(createTokenSettings({ isDevelop: true })));
```

### Routes

```javascript
router.get(
  `/oauth/authenticate`,
  router.oauth.authenticate(),
  async (_req, res) => {
    const token = res.oauth.token;
    const scope = token.scope;

    res.json({
      scope,
      email: token.user.email,
      expires: token.accessTokenExpiresAt,
    });
  },
);

router.get(
  `/oauth/userinfo`,
  router.oauth.authenticate(),
  async (_req, res) => {
    const token = res.oauth.token;
    const scope = token.scope;

    res.json({
      scope,
      user_id: token.user.userId,
    });
  },
);
```

For JWT access tokens, pass a second argument to `ExpressOAuthServer` with `verifyToken` so `authenticate` can attach `res.oauth.info`.
