import {
  integer,
  pgSchema,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export function defineOAuthDrizzleSchema(schemaName: string) {
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

  return {
    oauthClients,
    oauthUsers,
    oauthAccessTokens,
    oauthRefreshTokens,
  };
}

export type OAuthDrizzleSchema = {
  oauthClients: ReturnType<typeof defineOAuthDrizzleSchema>['oauthClients'];
  oauthUsers: ReturnType<typeof defineOAuthDrizzleSchema>['oauthUsers'];
  oauthAccessTokens: ReturnType<typeof defineOAuthDrizzleSchema>['oauthAccessTokens'];
  oauthRefreshTokens: ReturnType<typeof defineOAuthDrizzleSchema>['oauthRefreshTokens'];
};
