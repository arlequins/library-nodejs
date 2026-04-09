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

export type CreateOAuthModelsOptions = {
  /**
   * Required for password grant. Called as `model.getUser(username, password, client)`
   * by @node-oauth/oauth2-server.
   */
  getUser: (
    username: string,
    password: string,
    client: OAuth2Server.Client,
  ) => Promise<OAuthUser | false>;
};

/**
 * OAuth `model` bundle for `@node-oauth/oauth2-server`, backed by Drizzle `db`.
 * **`drizzleSchema`** must be the same table bundle used to build `db` (e.g. from `createOAuthDatabaseClient` when using a non-`public` PG schema).
 */
export function createDrizzleOAuthModels(
  db: NodePgDatabase<OAuthDrizzleSchema>,
  options: CreateOAuthModelsOptions,
  drizzleSchema: OAuthDrizzleSchema,
): OAuthModelBundle {
  const { getUser } = options;
  const { oauthClients, oauthUsers, oauthAccessTokens, oauthRefreshTokens } =
    drizzleSchema;

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

    if (
      !accessTokenRow.expires ||
      accessTokenRow.oauthClientId == null ||
      accessTokenRow.userId == null
    ) {
      return null;
    }

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

    if (!client || !oauthUserRow) {
      return null;
    }

    const allowed = await validateScope(
      oauthUserRowToOAuthUser(oauthUserRow),
      client as unknown as OAuth2Server.Client,
      [accessTokenRow.scope],
    );
    if (!Array.isArray(allowed) || allowed.length === 0) {
      return null;
    }

    const accessClient = oauthClientFromRow(client, {
      clientId: client.clientId,
      clientSecret: client.clientSecret ?? '',
    });

    return {
      accessToken,
      accessTokenExpiresAt: accessTokenRow.expires,
      client: accessClient,
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

  const saveToken = async <T extends OAuthUser>(
    token: OAuth2Server.Token,
    client: OAuth2Server.Client,
    user: OAuth2Server.User,
  ): Promise<ReturnOAuthToken<T> | OAuth2Server.Falsey> => {
    try {
      await db.transaction(async (tx) => {
        const oauthUser = user as OAuthUser;
        const oauthClient = client as ReturnOAuthClient;

        const now = new Date();
        await tx.insert(oauthAccessTokens).values({
          accessToken: token.accessToken,
          expires: token.accessTokenExpiresAt!,
          scope: oauthUser.scope,
          oauthClientId: oauthClient.oauthClientId,
          userId: oauthUser.userId,
          createdAt: now,
          updatedAt: now,
        });

        if (token.refreshToken) {
          await tx.insert(oauthRefreshTokens).values({
            refreshToken: token.refreshToken,
            expires: token.refreshTokenExpiresAt!,
            scope: oauthUser.scope,
            oauthClientId: oauthClient.oauthClientId,
            userId: oauthUser.userId,
            createdAt: now,
            updatedAt: now,
          });
        }
      });
    } catch (error) {
      console.error('saveToken', error);
      return null;
    }

    const oauthUser = user as OAuthUser;
    const oauthClient = client as ReturnOAuthClient;

    return {
      accessToken: token.accessToken,
      accessTokenExpiresAt: token.accessTokenExpiresAt!,
      refreshToken: token.refreshToken ?? '',
      refreshTokenExpiresAt: token.refreshTokenExpiresAt!,
      client: oauthClient,
      user: oauthUser as T,
      scope: [oauthUser.scope],
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

    if (
      refreshTokenRow.oauthClientId == null ||
      refreshTokenRow.userId == null ||
      !refreshTokenRow.expires
    ) {
      return null;
    }

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
