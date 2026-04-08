export type OAuthClient = {
  oauthClientId: number;
  name: string;
  clientId: string;
  clientSecret: string;
  redirectUris: string;
  grantTypes: string;
  scope: string;
};

export type OAuthUser = {
  userId: string;
  id: string;
  scope: string;
  password?: string | null;
  salt?: string | null;
  iterations?: number | null;
};

export type ReturnOAuthRefreshToken = {
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  scope: string;
  client: ReturnOAuthClient;
  user: OAuthUser;
};

export type ReturnOAuthAccessToken = {
  accessToken: string;
  accessTokenExpiresAt: Date;
  user: Pick<OAuthUser, 'userId'>;
  scope: string[];
};

/**
 * Client shape for @node-oauth/oauth2-server (`Client` uses `id` for refresh_token grant checks).
 */
export type ReturnOAuthClient = {
  oauthClientId: number;
  clientId: string
  clientSecret: string;
  grants: string[];
  redirectUris: string[];
  scope: string;

  /** Must match `clientId` — library compares `token.client.id === client.id`. */
  id: string; // clientId
};

export type ReturnOAuthToken<T extends OAuthUser = OAuthUser> = {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  client: ReturnOAuthClient;
  user: T;
  scope: string[];
};

/**
 * Hooks used when building JWT + DB OAuth (e.g. with {@link createJwtOAuthModels}).
 * Implementations live in the application; typings are for shared contracts.
 */
export type OAuthModelsFns = {
  isDevelopment: boolean;
  utils: {
    dummyUsers: ReadonlyArray<{ userCode: string; }>;
    setTime: (v: unknown) => { toDate: () => Date };
    setMils: (exp: number) => number;
  };
};

/**
 * Model implementation for `@node-oauth/oauth2-server` (`model` option).
 * Built by {@link createDrizzleOAuthModels} or {@link createJwtOAuthModels}.
 */
export type OAuthModelBundle = {
  getRefreshToken: (refreshToken: string) => Promise<ReturnOAuthRefreshToken | null>;
  getClient: (
    clientId: string,
    clientSecret: string,
  ) => Promise<ReturnOAuthClient | false | null>;
  saveToken: <T extends OAuthUser>(
    token: ReturnOAuthToken<T>,
    client: ReturnOAuthClient,
    user: OAuthUser,
  ) => Promise<ReturnOAuthToken<T> | null>;
  revokeToken: (refreshTokenPayload: ReturnOAuthRefreshToken) => Promise<boolean | null>;
  getUser: (
    username: string,
    password: string,
    client: ReturnOAuthClient,
  ) => Promise<OAuthUser | false>;
  validateScope: (user: OAuthUser, client: OAuthClient, requestedScope: string[]) => string[];
  getAccessToken: (accessToken: string) => Promise<ReturnOAuthAccessToken | null>;
  verifyScope: (
    accessToken: { scope?: string[] | string | null | undefined },
    requiredScopes: string[],
  ) => boolean | Promise<boolean>;
};
