import {
  integer,
  pgSchema,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

/**
 * Build OAuth table definitions bound to a PostgreSQL schema (namespace), e.g. `myapp.oauth_clients`.
 * Results are cached per `schemaName` so `defineOAuthDrizzleSchema('public')` matches the default exports.
 */
function buildOAuthSchemaOnce(schemaName: string) {
  const s = pgSchema(schemaName);

  const oauthClients = s.table('oauth_clients', {
    oauthClientId: serial('oauth_client_id').primaryKey(),
    name: text('name').notNull(),
    clientId: text('client_id').notNull(),
    clientSecret: text('client_secret').notNull(),
    redirectUris: text('redirect_uris').notNull(),
    grantTypes: text('grant_types').notNull(),
    scope: text('scope').notNull(),
  });

  const oauthUsers = s.table('oauth_users', {
    userId: text('user_id').primaryKey(),
    scope: text('scope').notNull(),
    password: text('password'),
    salt: text('salt'),
    iterations: integer('iterations'),
  });

  const oauthAccessTokens = s.table('oauth_access_tokens', {
    oauthAccessTokenId: serial('oauth_access_token_id').primaryKey(),
    accessToken: text('access_token').notNull(),
    expires: timestamp('expires', { withTimezone: true, mode: 'date' }).notNull(),
    scope: text('scope').notNull(),
    oauthClientId: integer('oauth_client_id').notNull(),
    userId: text('user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  });

  const oauthRefreshTokens = s.table('oauth_refresh_tokens', {
    oauthRefreshTokenId: serial('oauth_refresh_token_id').primaryKey(),
    refreshToken: text('refresh_token').notNull(),
    expires: timestamp('expires', { withTimezone: true, mode: 'date' }).notNull(),
    scope: text('scope').notNull(),
    oauthClientId: integer('oauth_client_id').notNull(),
    userId: text('user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  });

  const oauthSchema = {
    oauthClients,
    oauthUsers,
    oauthAccessTokens,
    oauthRefreshTokens,
  };

  return {
    oauthClients,
    oauthUsers,
    oauthAccessTokens,
    oauthRefreshTokens,
    oauthSchema,
  };
}

const publicBundle = buildOAuthSchemaOnce('public');

export const oauthClients = publicBundle.oauthClients;
export const oauthUsers = publicBundle.oauthUsers;
export const oauthAccessTokens = publicBundle.oauthAccessTokens;
export const oauthRefreshTokens = publicBundle.oauthRefreshTokens;

/** Default `public` schema — pass to `drizzle(pool, { schema: oauthSchema })`. */
export const oauthSchema = publicBundle.oauthSchema;

export type OAuthDrizzleSchema = typeof oauthSchema;

const bundleCache = new Map<string, typeof publicBundle>([
  ['public', publicBundle],
]);

/**
 * Table bundle for the given PostgreSQL schema name (not the DB name).
 * Use the returned `oauthSchema` with `createOAuthDatabaseClient` / `drizzle`, and the same bundle with `@arlequins/oauth2` model factories.
 */
export function defineOAuthDrizzleSchema(schemaName: string): typeof publicBundle {
  const key = schemaName;
  let bundle = bundleCache.get(key);
  if (!bundle) {
    bundle = buildOAuthSchemaOnce(schemaName);
    bundleCache.set(key, bundle);
  }
  return bundle;
}
