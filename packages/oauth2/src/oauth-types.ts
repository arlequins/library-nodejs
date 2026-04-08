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
  /** Must match `clientId` — library compares `token.client.id === client.id`. */
  id: string;
  oauthClientId: number;
  clientId: string;
  clientSecret: string;
  grants: string[];
  redirectUris: string[];
  scope: string;
};

export type ReturnOAuthToken<T> = {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  client: ReturnOAuthClient;
  user: T;
  scope: string[];
};

export interface PersistedPassword {
  salt: string;
  hash: string;
  iterations: number;
}

export type HashPasswordOptions = {
  iterations?: number;
  keyLength?: number;
  digest?: string;
  saltBytes?: number;
};

export type VerifyPasswordOptions = {
  keyLength?: number;
  digest?: string;
};

/** Payload passed to JWT `generateToken` in JWT-backed OAuth flows. */
export type JwtGenerateTokenPayload = {
  userId: string;
  userCode: string;
  email: string | null;
  name: string | null;
  scope: string;
  permission: {
    normal: unknown;
    etc: unknown;
  };
};

/**
 * Hooks used when building JWT + DB OAuth (e.g. with {@link createJwtOAuthModels}).
 * Implementations live in the application; typings are for shared contracts.
 */
export type OAuthModelsFns<Y = unknown> = {
  verifyToken: (token: string) => Y | null;
  generateToken: (payload: JwtGenerateTokenPayload) => string;
  fetchPermissions: (userCode: string) => Promise<unknown>;
  fetchEtcPermissions: (userCode: string) => Promise<unknown>;
  isDevelopment: boolean;
  utils: {
    dummyUsers: ReadonlyArray<{ userCode: string; userName: string }>;
    hashPassword: (password: string) => Promise<PersistedPassword>;
    verifyPassword: (
      persisted: PersistedPassword,
      password: string,
    ) => Promise<boolean>;
    setTime: (v: unknown) => { toDate: () => Date };
    setMils: (exp: number) => unknown;
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
  saveToken: <T>(
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
  validateScope: (user: any, client: any, requestedScope: string[]) => string[];
  getAccessToken: (accessToken: string) => Promise<ReturnOAuthAccessToken | null>;
  verifyScope: (
    accessToken: { scope?: string[] | string | null | undefined },
    requiredScopes: string[],
  ) => boolean | Promise<boolean>;
};
