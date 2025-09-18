import dayjs from 'dayjs';
import { OAuthClient, OAuthUser } from '../dist/generated/prisma'

type OauthClientPayload = {
  clientId: string;
  clientSecret?: string;
  userId: string;
};

type OauthClient = {
  oauthClientId: number;
  clientId: string;
  clientSecret?: string;
  grants: string[];
  redirectUris: string[];
  scope: string;
};

type OauthUser = {
  userId: string;
  email: string;
  scope: string;
};

type OauthToken = {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken?: string;
  refreshTokenExpiresAt: Date;
  client: OauthClient;
  user: OauthUser;
  scope: string[];
};

type OauthRefreshToken = {
  refreshToken: string;
  refreshTokenExpiresAt: Date|null;
  scope: string;
  client: OAuthClient;
  user: OAuthUser;
};

const EXPIRE_TIMESTAMP = '2015-05-28T06:59:53.000Z';

const createModels = (prisma) => {
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
    token: {
      scope: string;
    },
    scope: string,
  ) => token.scope === scope;

  const getUserFromClient = async ({
    clientId,
    clientSecret,
    userId,
  }: OauthClientPayload) => {
    const clientRow = clientSecret
      ? await prisma.oAuthClient.findFirst({
          where: {
            clientId,
            clientSecret,
          },
        })
      : await prisma.oAuthClient.findFirst({
          where: {
            clientId,
          },
        });

    if (!clientRow) {
      throw new Error('fail on getUserFromClient');
    }

    const user = await prisma.oAuthUser.findUnique({
      where: {
        userId,
      },
      select: {
        userId: true,
        scope: true,
        user: {
          select: {
            email: true,
          },
          where: {
            deleteFlag: false,
          }
        }
      },
    });  

    if (!clientRow || !user) {
      throw new Error('fail on getUserFromClient');
    }

    return {
      user,
      client: clientRow,
      scope: user.scope,
    };
  };

  const getUser = async (email: string, input: string) => {
    const user = await prisma.user.findFirst({
      where: {
        email, // WHERE u.email = :email
        deleteFlag: false, // AND u.delete_flag = false
      },
    });

    if (!user) {
      return false;
    }

    const oauthUser = await prisma.oAuthUser.findFirst({
      where: {
        userId: user.userId,
      },
      select: {
        password: true,
        scope: true,
      }
    });

    if (!oauthUser) {
      return false;
    }

    const compareResult = oauthUser.password === input

    if (!compareResult) {
      return false;
    }

    return {
      userId: user.userId,
      email,
      scope: oauthUser.scope,
    };
  };

  const getAccessToken = async (accessToken: string) => {
    const accessTokenRow = await prisma.oAuthAccessToken.findFirst({
      where: {
        accessToken, // WHERE access_token = :accessToken
      },
      select: {
        accessToken: true,
        expires: true,
        scope: true,
        oauthClientId: true,
        userId: true,
      },
      orderBy: {
        createdAt: 'desc', // ORDER BY created_at DESC
      },
    });
    if (!accessTokenRow || !accessTokenRow.oauthClientId || !accessTokenRow.userId) return null;

    const client = await prisma.oAuthClient.findUnique({
      where: {
        oauthClientId: accessTokenRow.oauthClientId, // WHERE oauth_client_id = :oauthClientId
      },
    });

    const user = await prisma.oAuthUser.findUnique({
      where: {
        userId: accessTokenRow.userId, // WHERE ou.user_id = :userId
      },
    });

    if (
      !client ||
      !user ||
      !validateScope(user, client, [accessTokenRow.scope])
    ) {
      return null;
    }

    return {
      accessToken,
      accessTokenExpiresAt: accessTokenRow.expires,
      client,
      user,
      scope: [accessTokenRow.scope],
    };
  };

  const getClient = async (clientId: string, clientSecret: string) => {
    const client = clientSecret
      ? await prisma.oAuthClient.findFirst({
          where: {
            clientId,
            clientSecret,
          },
        })
      : await prisma.oAuthClient.findFirst({
          where: {
            clientId,
          },
        });

    if (!client) {
      throw new Error('fail on getClient');
    }
    return {
      oauthClientId: client.oauthClientId,
      clientId,
      clientSecret,
      grants: client.grantTypes,
      redirectUris: client.redirectUris,
      scope: client.scope,
    } satisfies OauthClient;
  };

  const revokeToken = async (refreshTokenPayload: OauthRefreshToken) => {
    try {
      const refreshTokenRow = await prisma.oAuthRefreshToken.findFirst({
        where: {
          refreshToken: refreshTokenPayload.refreshToken, // WHERE refresh_token = :refreshToken
        },
        select: {
          oauthRefreshTokenId: true,
          refreshToken: true,
          expires: true,
          scope: true,
          oauthClientId: true,
          userId: true,
        },
        orderBy: {
          createdAt: 'desc' // ORDER BY created_at DESC
        }
      });

      if (!refreshTokenRow) {
        return null;
      }

      await prisma.oAuthRefreshToken.updateMany({
        where: {
          oauthRefreshTokenId: refreshTokenRow.oauthRefreshTokenId, // WHERE oauth_refresh_token_id = :oauthRefreshTokenId
          expires: {
            gte: new Date(), // AND expires >= NOW()
          },
        },
        data: {
          expires: dayjs(EXPIRE_TIMESTAMP).toDate(), // Set expires to the new value
        },
      });

      return true;
    } catch (error) {
      console.error('revokeToken', error);
      return false;
    }
  };

  const saveToken = async (
    token: OauthToken,
    client: OauthClient,
    user: OauthUser,
  ) => {
    try {
      await prisma.$transaction(async(tx) => {
        await prisma.oAuthAccessToken.create({
          data: {
            accessToken: token.accessToken,
            expires: token.accessTokenExpiresAt,
            scope: user.scope,
            oauthClientId: client.oauthClientId,
            userId: user.userId,
          }
        });
    
        if (token.refreshToken) {
          await prisma.oAuthRefreshToken.create({
            data: {
              refreshToken: token.refreshToken,
              expires: token.refreshTokenExpiresAt,
              scope: user.scope,
              oauthClientId: client.oauthClientId,
              userId: user.userId,
            }
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
      user,
      scope: [user.scope],
    };
  };

  const getRefreshToken = async (refreshToken: string) => {
    const refreshTokenRow = await prisma.oAuthRefreshToken.findFirst({
      where: {
        refreshToken, // WHERE refresh_token = :refreshToken
      },
      orderBy: {
        createdAt: 'desc' // ORDER BY created_at DESC
      }
    });

    if (!refreshTokenRow || !refreshTokenRow.oauthClientId || !refreshTokenRow.userId) return null;

    const client = await prisma.oAuthClient.findFirst({
      where: {
        oauthClientId: refreshTokenRow.oauthClientId, // WHERE oauth_client_id = :oauthClientId
      },
    });

    const user = await prisma.oAuthUser.findFirst({
      where: {
        userId: refreshTokenRow.userId, // WHERE ou.user_id = :userId
      },
    });

    if (
      !client ||
      !user ||
      !validateScope(user, client, [refreshTokenRow.scope])
    ) {
      return null;
    }

    return {
      refreshToken,
      refreshTokenExpiresAt: refreshTokenRow.expires,
      scope: refreshTokenRow.scope,
      client,
      user,
    } satisfies OauthRefreshToken;
  };

  return {
    getUserFromClient,

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

export default createModels;
