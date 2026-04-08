import dayjs from 'dayjs';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type {
  OAuthClient,
  OAuthModelBundle,
  OAuthUser,
  ReturnOAuthAccessToken,
  ReturnOAuthClient,
  ReturnOAuthRefreshToken,
  ReturnOAuthToken,
} from '../oauth-types';
import { oauthClientFromRow, verifyAccessTokenScopes } from './shared';

import type { OAuthDrizzleSchema } from '@arlequins/oauth2-drizzle';
import {
  oauthClients,
  oauthRefreshTokens,
  oauthUsers,
} from '@arlequins/oauth2-drizzle';

const REVOKED_TOKEN_PLACEHOLDER_EXPIRY = '2015-05-28T06:59:53.000Z';

/**
 * Injected hooks for JWT / profile flows (use inside your `getUser` / `saveToken` implementations).
 * `TFetchUserInfo` / `TNewUser` are app-defined shapes; this package does not call these hooks.
 */
export type JwtOAuthModelHooks<
  TFetchUserInfo = unknown,
  TNewUser = unknown,
> = {
  fetchUserInfo: (
    userCode: string,
  ) => Promise<TFetchUserInfo | null>;
  fetchAuthUser: (
    id: string,
    password: string,
  ) => Promise<TFetchUserInfo | null>;
  makeUserUniqueId: () => Promise<string>;
  createNewUser: (args: {
    userCode: string;
    password: string;
  }) => Promise<TNewUser>;
};

/**
 * Options for {@link createJwtOAuthModels}, same idea as {@link CreateOAuthModelsOptions} in `normal.ts`:
 * supply `getUser`, `getAccessToken`, and `saveToken`, plus hooks your code uses when implementing those.
 */
export type CreateJwtOAuthModelsOptions<
  TFetchUserInfo = unknown,
  TNewUser = unknown,
> = JwtOAuthModelHooks<TFetchUserInfo, TNewUser> & {
  getUser: (
    username: string,
    password: string,
    client: ReturnOAuthClient,
  ) => Promise<OAuthUser | false>;
  getAccessToken: (
    accessToken: string,
  ) => Promise<ReturnOAuthAccessToken | null>;
  saveToken: <T extends OAuthUser>(
    token: ReturnOAuthToken<T>,
    client: ReturnOAuthClient,
    user: OAuthUser,
  ) => Promise<ReturnOAuthToken<T> | null>;
};

function oauthUserRowToOAuthUser(
  row: typeof oauthUsers.$inferSelect,
): OAuthUser {
  return {
    userId: row.userId,
    id: row.userId,
    scope: row.scope,
    password: row.password ?? null,
    salt: row.salt ?? null,
    iterations: row.iterations ?? null,
  };
}

/**
 * JWT-oriented OAuth `model`: `getUser` / `getAccessToken` / `saveToken` are **injected**;
 * `oauth_clients` / `oauth_*_tokens` / `oauth_users` reads for client + refresh flows use Drizzle.
 */
export function createJwtOAuthModels<
  TFetchUserInfo = unknown,
  TNewUser = unknown,
>(
  db: NodePgDatabase<OAuthDrizzleSchema>,
  options: CreateJwtOAuthModelsOptions<TFetchUserInfo, TNewUser>,
): OAuthModelBundle {
  const { getUser, getAccessToken, saveToken } = options;

  const validateScope = (
    user: OAuthUser,
    client: OAuthClient,
    requestedScope: string[],
  ): string[] => {
    if (
      user?.scope === client?.scope &&
      requestedScope.some((obj) => obj === user?.scope)
    ) {
      return requestedScope;
    }
    return [];
  };

  const verifyScope = (
    accessToken: { scope?: string[] | string | null | undefined },
    requiredScopes: string[],
  ): boolean => verifyAccessTokenScopes(accessToken, requiredScopes);

  const getClient = async (
    clientId: string,
    clientSecret: string,
  ): Promise<ReturnOAuthClient | null> => {
    const client = clientSecret
      ? await db
          .select()
          .from(oauthClients)
          .where(
            and(
              eq(oauthClients.clientId, clientId),
              eq(oauthClients.clientSecret, clientSecret),
            ),
          )
          .limit(1)
      : await db
          .select()
          .from(oauthClients)
          .where(eq(oauthClients.clientId, clientId))
          .limit(1);

    const row = client[0];
    if (!row) {
      return null;
    }

    return oauthClientFromRow(row, {
      clientId,
      clientSecret: clientSecret ?? row.clientSecret ?? '',
    });
  };

  const revokeToken = async (
    refreshTokenPayload: ReturnOAuthRefreshToken,
  ): Promise<boolean | null> => {
    try {
      const rows = await db
        .select({
          oauthRefreshTokenId: oauthRefreshTokens.oauthRefreshTokenId,
          refreshToken: oauthRefreshTokens.refreshToken,
          expires: oauthRefreshTokens.expires,
          scope: oauthRefreshTokens.scope,
          oauthClientId: oauthRefreshTokens.oauthClientId,
          userId: oauthRefreshTokens.userId,
        })
        .from(oauthRefreshTokens)
        .where(
          eq(oauthRefreshTokens.refreshToken, refreshTokenPayload.refreshToken),
        )
        .orderBy(desc(oauthRefreshTokens.createdAt))
        .limit(1);

      const refreshTokenRow = rows[0];

      if (!refreshTokenRow) {
        return null;
      }

      await db
        .update(oauthRefreshTokens)
        .set({
          expires: dayjs(REVOKED_TOKEN_PLACEHOLDER_EXPIRY).toDate(),
        })
        .where(
          and(
            eq(
              oauthRefreshTokens.oauthRefreshTokenId,
              refreshTokenRow.oauthRefreshTokenId,
            ),
            gte(oauthRefreshTokens.expires, sql`now()`),
          ),
        );

      return true;
    } catch (error) {
      console.error('revokeToken', error);
      return false;
    }
  };

  const getRefreshToken = async (
    refreshToken: string,
  ): Promise<ReturnOAuthRefreshToken | null> => {
    const rtRows = await db
      .select()
      .from(oauthRefreshTokens)
      .where(eq(oauthRefreshTokens.refreshToken, refreshToken))
      .orderBy(desc(oauthRefreshTokens.createdAt))
      .limit(1);

    if (!rtRows[0]) return null;

    const refreshTokenRow = rtRows[0];

    const clientRows = await db
      .select()
      .from(oauthClients)
      .where(eq(oauthClients.oauthClientId, refreshTokenRow.oauthClientId))
      .limit(1);

    const userRows = await db
      .select()
      .from(oauthUsers)
      .where(eq(oauthUsers.userId, refreshTokenRow.userId))
      .limit(1);

    const clientRow = clientRows[0];
    const userRow = userRows[0];

    if (
      !clientRow ||
      !userRow ||
      !validateScope(
        oauthUserRowToOAuthUser(userRow),
        clientRow,
        [refreshTokenRow.scope],
      )
    ) {
      return null;
    }

    const mappedClient = oauthClientFromRow(clientRow, {
      clientId: clientRow.clientId,
      clientSecret: clientRow.clientSecret ?? '',
    });

    return {
      refreshToken,
      refreshTokenExpiresAt: refreshTokenRow.expires,
      scope: refreshTokenRow.scope,
      client: mappedClient,
      user: oauthUserRowToOAuthUser(userRow),
    };
  };

  return {
    getRefreshToken,
    getClient,
    saveToken,
    revokeToken,
    getUser,
    validateScope,
    getAccessToken,
    verifyScope,
  };
}
