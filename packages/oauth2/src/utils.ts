export const makePostgresqlUrl = ({
  username,
  password,
  host,
  port,
  database,
  schema,
}) => {
  return `postgresql://${username}:${password}@${host}:${port}/${database}?schema=${schema}`;
};

export const createTokenSettings = (isDevelop: boolean) => {
  const lifetime = {
    authorizeToken: 5 * 60, // 5 mins
    accessToken: isDevelop ? 60 * 2 : 60 * 30, // dev 5 min, prod 30 mins
    refreshToken: isDevelop ? 60 * 60 * 2 : 60 * 60 * 12, // dev 2 hours, prod 12 hours
  };
  
  return {
    accessTokenLifetime: lifetime.accessToken,
    refreshTokenLifetime: lifetime.refreshToken,
    requireClientAuthentication: {
      client_credentials: false,
      password: false,
      refresh_token: false,
    },
    allowExtendedTokenAttributes: true,
    alwaysIssueNewRefreshToken: true,
  }
}
