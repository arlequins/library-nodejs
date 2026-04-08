import { ReturnOAuthClient } from "../oauth-types";

/** Build a client object with required `id` + `grants[]` from a typical OAuth client row. */
export function oauthClientFromRow(
  row: {
    oauthClientId: number;
    clientId: string;
    clientSecret?: string | null;
    grantTypes?: string | null;
    redirectUris?: string | string[] | null;
    scope?: string | null;
  },
  credentials: { clientId: string; clientSecret: string },
): ReturnOAuthClient {
  const gt = String(row.grantTypes ?? '');
  const ru = row.redirectUris;
  const redirectUris = Array.isArray(ru)
    ? ru.map(String)
    : String(ru ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  return {
    id: credentials.clientId,
    oauthClientId: row.oauthClientId,
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    grants: gt
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    redirectUris,
    scope: String(row.scope ?? ''),
  };
}

/** Authenticate handler calls `verifyScope(accessToken, requiredScopes: string[])`. */
export function verifyAccessTokenScopes(
  accessToken: { scope?: string[] | string | null | undefined },
  requiredScopes: string[],
): boolean {
  if (!requiredScopes.length) {
    return true;
  }
  const raw = accessToken.scope;
  const tokenScopes = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(/\s+/).filter(Boolean)
      : [];
  return requiredScopes.every((s) => tokenScopes.includes(s));
}
