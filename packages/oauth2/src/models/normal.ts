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
  oauthAccessTokens,
  oauthClients,
  oauthRefreshTokens,
  oauthUsers,
} from '@arlequins/oauth2-drizzle';

const REVOKED_TOKEN_PLACEHOLDER_EXPIRY = '2015-05-28T06:59:53.000Z';

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

export type CreateOAuthModelsOptions = {
  /**
   * Required for password grant. Called as `model.getUser(username, password, client)`
   * by @node-oauth/oauth2-server.
   */
  getUser: (
    username: string,
    password: string,
    client: ReturnOAuthClient,
  ) => Promise<OAuthUser | false>;
};

/**
 * OAuth `model` bundle for `@node-oauth/oauth2-server`, backed by Drizzle + PostgreSQL.
 * Tables must match `oauthSchema` from `@arlequins/oauth2-drizzle`.
 */
export function createDrizzleOAuthModels(
  db: NodePgDatabase<OAuthDrizzleSchema>,
  options: CreateOAuthModelsOptions,
): OAuthModelBundle {
  const { getUser } = options;

  const validateScope = (
    user: OAuthUser,
    client: OAuthClient,
    requestedScope: string[],
  ) => {
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

  const getAccessToken = async (
    accessToken: string,
  ): Promise<ReturnOAuthAccessToken | null> => {
    const rows = await db
      .select({
        accessToken: oauthAccessTokens.accessToken,
        expires: oauthAccessTokens.expires,
        scope: oauthAccessTokens.scope,
        oauthClientId: oauthAccessTokens.oauthClientId,
        userId: oauthAccessTokens.userId,
      })
      .from(oauthAccessTokens)
      .where(eq(oauthAccessTokens.accessToken, accessToken))
      .orderBy(desc(oauthAccessTokens.createdAt))
      .limit(1);

    const accessTokenRow = rows[0];
    if (!accessTokenRow) return null;

    const clientRows = await db
      .select()
      .from(oauthClients)
      .where(eq(oauthClients.oauthClientId, accessTokenRow.oauthClientId))
      .limit(1);

    const oauthUserRows = await db
      .select()
      .from(oauthUsers)
      .where(eq(oauthUsers.userId, accessTokenRow.userId))
      .limit(1);

    const client = clientRows[0];
    const oauthUserRow = oauthUserRows[0];

    if (
      !client ||
      !oauthUserRow ||
      !validateScope(oauthUserRowToOAuthUser(oauthUserRow), client, [
        accessTokenRow.scope,
      ])
    ) {
      return null;
    }

    return {
      accessToken,
      accessTokenExpiresAt: accessTokenRow.expires,
      user: { userId: oauthUserRow.userId },
      scope: [accessTokenRow.scope],
    };
  };

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

  const revokeToken = async (refreshTokenPayload: ReturnOAuthRefreshToken) => {
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

  const saveToken = async <T extends OAuthUser>(
    token: ReturnOAuthToken<T>,
    client: ReturnOAuthClient,
    user: OAuthUser,
  ): Promise<ReturnOAuthToken<T> | null> => {
    try {
      await db.transaction(async (tx) => {
        await tx.insert(oauthAccessTokens).values({
          accessToken: token.accessToken,
          expires: token.accessTokenExpiresAt,
          scope: user.scope,
          oauthClientId: client.oauthClientId,
          userId: user.userId,
        });

        if (token.refreshToken) {
          await tx.insert(oauthRefreshTokens).values({
            refreshToken: token.refreshToken,
            expires: token.refreshTokenExpiresAt,
            scope: user.scope,
            oauthClientId: client.oauthClientId,
            userId: user.userId,
          });
        }
      });
    } catch (error) {
      console.error('saveToken', error);
      return null;
    }

    return {
      accessToken: token.accessToken,
      accessTokenExpiresAt: token.accessTokenExpiresAt,
      refreshToken: token.refreshToken,
      refreshTokenExpiresAt: token.refreshTokenExpiresAt,
      client,
      user: user as T,
      scope: [user.scope],
    } satisfies ReturnOAuthToken<T>;
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
