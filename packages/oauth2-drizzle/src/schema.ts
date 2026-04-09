import {
  boolean,
  integer,
  pgSchema,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

/**
 * OAuth tables for a PostgreSQL schema (e.g. `oauth2`). Pass the schema **name**, not the DB name.
 */
export function defineOAuthDrizzleSchema(schemaName: string) {
  const s = pgSchema(schemaName);

  const oauthClients = s.table('oauth_clients', {
    oauthClientId: serial('oauth_client_id').primaryKey(),
    name: text('name').notNull(),
    clientId: text('client_id').notNull(),
    clientSecret: text('client_secret').notNull(),
    redirectUris: text('redirect_uris'),
    grantTypes: text('grant_types'),
    scope: text('scope').notNull(),
  });

  const oauthUsers = s.table('oauth_users', {
    userId: text('user_id').primaryKey(),
    password: text('password').notNull(),
    salt: text('salt'),
    iterations: integer('iterations'),
    scope: text('scope').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  });

  const oauthAccessTokens = s.table('oauth_access_tokens', {
    oauthAccessTokenId: serial('oauth_access_token_id').primaryKey(),
    accessToken: text('access_token').notNull(),
    expires: timestamp('expires', { withTimezone: true, mode: 'date' }),
    scope: text('scope').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    oauthClientId: integer('oauth_client_id'),
    userId: text('user_id'),
  });

  const oauthRefreshTokens = s.table('oauth_refresh_tokens', {
    oauthRefreshTokenId: serial('oauth_refresh_token_id').primaryKey(),
    refreshToken: text('refresh_token').notNull(),
    expires: timestamp('expires', { withTimezone: true, mode: 'date' }),
    scope: text('scope').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    oauthClientId: integer('oauth_client_id'),
    userId: text('user_id'),
  });

  const oauthScopes = s.table('oauth_scopes', {
    oauthScopeId: serial('oauth_scope_id').primaryKey(),
    scope: text('scope').notNull(),
    isDefault: boolean('is_default').notNull(),
  });

  return {
    oauthClients,
    oauthUsers,
    oauthAccessTokens,
    oauthRefreshTokens,
    oauthScopes,
  };
}

export type OAuthDrizzleSchema = {
  oauthClients: ReturnType<typeof defineOAuthDrizzleSchema>['oauthClients'];
  oauthUsers: ReturnType<typeof defineOAuthDrizzleSchema>['oauthUsers'];
  oauthAccessTokens: ReturnType<typeof defineOAuthDrizzleSchema>['oauthAccessTokens'];
  oauthRefreshTokens: ReturnType<typeof defineOAuthDrizzleSchema>['oauthRefreshTokens'];
  oauthScopes: ReturnType<typeof defineOAuthDrizzleSchema>['oauthScopes'];
};
