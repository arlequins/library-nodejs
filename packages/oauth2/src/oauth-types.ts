import type OAuth2Server from '@node-oauth/oauth2-server';

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

/** Matches `RefreshToken` from `@node-oauth/oauth2-server` (`scope` as `string[]`). */
export type ReturnOAuthRefreshToken = {
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  scope: string[];
  client: ReturnOAuthClient;
  user: OAuthUser;
};

/** Matches `Token` fields used after `getAccessToken` (includes required `client`). */
export type ReturnOAuthAccessToken = {
  accessToken: string;
  accessTokenExpiresAt: Date;
  client: ReturnOAuthClient;
  user: Pick<OAuthUser, 'userId'>;
  scope: string[];
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
 * `model` option for password + refresh_token grants — assignable to
 * `AuthorizationCodeModel | … | PasswordModel | …` for those server options.
 * Built by {@link createDrizzleOAuthModels} or {@link createJwtOAuthModels}.
 */
export type OAuthModelBundle = OAuth2Server.PasswordModel &
  OAuth2Server.RefreshTokenModel;
