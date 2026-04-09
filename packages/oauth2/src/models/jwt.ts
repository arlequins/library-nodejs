import dayjs from 'dayjs';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type OAuth2Server from '@node-oauth/oauth2-server';

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
    client: OAuth2Server.Client,
  ) => Promise<OAuthUser | false>;
  getAccessToken: (
    accessToken: string,
  ) => Promise<ReturnOAuthAccessToken | null>;
  saveToken: <T extends OAuthUser>(
    token: OAuth2Server.Token,
    client: OAuth2Server.Client,
    user: OAuth2Server.User,
  ) => Promise<ReturnOAuthToken<T> | null>;
};

/**
 * JWT-oriented OAuth `model`: `getUser` / `getAccessToken` / `saveToken` are **injected**;
 * `oauth_clients` / `oauth_*_tokens` / `oauth_users` reads for client + refresh flows use Drizzle.
 *
 * **`drizzleSchema`** must match the bundle used to create `db` (non-`public` PG schema, etc.).
 */
export function createJwtOAuthModels<
  TFetchUserInfo = unknown,
  TNewUser = unknown,
>(
  db: NodePgDatabase<OAuthDrizzleSchema>,
  options: CreateJwtOAuthModelsOptions<TFetchUserInfo, TNewUser>,
  drizzleSchema: OAuthDrizzleSchema,
): OAuthModelBundle {
  const { getUser, getAccessToken, saveToken } = options;
  const { oauthClients, oauthUsers, oauthRefreshTokens } = drizzleSchema;

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

  const validateScope = async (
    user: OAuth2Server.User,
    client: OAuth2Server.Client,
    requestedScope?: string[],
  ): Promise<OAuth2Server.Falsey | string[]> => {
    const scopes = requestedScope ?? [];
    const u = user as unknown as OAuthUser;
    const c = client as unknown as OAuthClient;
    if (
      u?.scope === c?.scope &&
      scopes.some((obj) => obj === u?.scope)
    ) {
      return scopes;
    }
    return [];
  };

  const verifyScope = async (
    token: OAuth2Server.Token,
    scope: string[],
  ): Promise<boolean> => verifyAccessTokenScopes(token, scope);

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
    refreshTokenPayload: OAuth2Server.RefreshToken,
  ): Promise<boolean> => {
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
        return false;
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

    if (!clientRow || !userRow) {
      return null;
    }

    const allowedRt = await validateScope(
      oauthUserRowToOAuthUser(userRow),
      clientRow as unknown as OAuth2Server.Client,
      [refreshTokenRow.scope],
    );
    if (!Array.isArray(allowedRt) || allowedRt.length === 0) {
      return null;
    }

    const mappedClient = oauthClientFromRow(clientRow, {
      clientId: clientRow.clientId,
      clientSecret: clientRow.clientSecret ?? '',
    });

    return {
      refreshToken,
      refreshTokenExpiresAt: refreshTokenRow.expires,
      scope: [refreshTokenRow.scope],
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
