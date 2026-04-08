import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

/**
 * Default OAuth tables for Drizzle + PostgreSQL.
 * Adjust with migrations in your app; column names use snake_case in PostgreSQL.
 */
export const oauthClients = pgTable('oauth_clients', {
  oauthClientId: serial('oauth_client_id').primaryKey(),
  name: text('name').notNull(),
  clientId: text('client_id').notNull(),
  clientSecret: text('client_secret').notNull(),
  redirectUris: text('redirect_uris').notNull(),
  grantTypes: text('grant_types').notNull(),
  scope: text('scope').notNull(),
});

export const oauthUsers = pgTable('oauth_users', {
  userId: text('user_id').primaryKey(),
  scope: text('scope').notNull(),
  password: text('password'),
  salt: text('salt'),
  iterations: integer('iterations'),
});

export const oauthAccessTokens = pgTable('oauth_access_tokens', {
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

export const oauthRefreshTokens = pgTable('oauth_refresh_tokens', {
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

/** Schema object passed to `drizzle(pool, { schema })`. */
export const oauthSchema = {
  oauthClients,
  oauthUsers,
  oauthAccessTokens,
  oauthRefreshTokens,
};

export type OAuthDrizzleSchema = typeof oauthSchema;
