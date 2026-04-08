import { AbstractGrantType } from '@node-oauth/oauth2-server';

export const createTokenSettings = (payload: {
  accessTokenLifetime?: number;
  refreshTokenLifetime?: number;
  requireClientAuthentication?: {
    clientCredentials: boolean;
    password: boolean;
    refreshToken: boolean;
  };
  allowExtendedTokenAttributes?: boolean;
  alwaysIssueNewRefreshToken?: boolean;
  extendedGrantTypes?: Record<string, typeof AbstractGrantType>;
  /** When true, uses shorter default lifetimes (override with explicit lifetimes). */
  isDevelop?: boolean;
}) => {
  const dev = payload.isDevelop ?? false;
  return {
    accessTokenLifetime:
      payload.accessTokenLifetime ?? (dev ? 60 * 2 : 60 * 30),
    refreshTokenLifetime:
      payload.refreshTokenLifetime ?? (dev ? 60 * 60 * 2 : 60 * 60 * 12),
    allowExtendedTokenAttributes: payload.allowExtendedTokenAttributes ?? true,
    requireClientAuthentication: {
      client_credentials:
        payload.requireClientAuthentication?.clientCredentials ?? false,
      password: payload.requireClientAuthentication?.password ?? false,
      refresh_token: payload.requireClientAuthentication?.refreshToken ?? false,
    },
    alwaysIssueNewRefreshToken: payload.alwaysIssueNewRefreshToken ?? true,
    extendedGrantTypes: payload.extendedGrantTypes ?? {},
  };
};
