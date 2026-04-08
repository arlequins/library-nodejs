# @arlequins/oauth2-drizzle

[Drizzle ORM](https://orm.drizzle.team/) + PostgreSQL schema helpers for OAuth tables used with [`@arlequins/oauth2`](https://www.npmjs.com/package/@arlequins/oauth2).

## Peer dependencies

```sh
npm install @arlequins/oauth2 @arlequins/oauth2-drizzle drizzle-orm pg
```

Migrations and Drizzle Kit live in **your** application: point `drizzle-kit` at this package’s exported schema (or copy the table definitions) and generate migrations there.

## Client (`createOAuthDb`)

Connection settings are **only** taken from the `options` argument — this package does **not** read `process.env`.

**URL:**

```typescript
import { createOAuthDb } from '@arlequins/oauth2-drizzle';

const { db, pool } = createOAuthDb({
  connectionString: 'postgres://user:pass@localhost:5432/dbname',
  poolConfig: { max: 20 },
});
```

**Host / port (optional `ssl`):**

```typescript
const { db, pool } = createOAuthDb({
  host: 'localhost',
  port: 5432,
  user: 'user',
  password: 'pass',
  database: 'dbname',
  ssl: 'require',
});
```

Your app can still load values from `process.env` and pass them into `createOAuthDb`; this library stays free of global env reads.

```typescript
createOAuthDb({
  connectionString: process.env.DATABASE_URL!,
});
```

Call `await pool.end()` on shutdown.

## Schema

Default table definitions live in `oauthSchema` (`oauth_clients`, `oauth_users`, `oauth_access_tokens`, `oauth_refresh_tokens`). Align your migrations with these columns or fork the schema module.

## Exports

| Export | Purpose |
|--------|---------|
| `createOAuthDb`, `CreateOAuthDbOptions`, `PgSsl` | Build `pg.Pool` + Drizzle from explicit options |
| `oauthSchema`, table symbols | Use in your app’s Drizzle schema / migrations |
