import OAuth2Server, {
  InvalidArgumentError,
  Request as OAuthRequest,
  Response as OAuthResponse,
  UnauthorizedRequestError,
} from '@node-oauth/oauth2-server';
import type { NextFunction, Request as ExpressRequest, Response as ExpressResponse } from 'express';

/** Optional hooks (e.g. JWT verification) passed as the second constructor argument. */
export interface ExpressOAuthServerAddition {
  verifyToken?: (accessToken: string, isRequired?: boolean) => unknown;
}

/** `ServerOptions` plus flags consumed by this wrapper (stripped before passing to OAuth2Server). */
export type ExpressOAuthServerOptions = OAuth2Server.ServerOptions & {
  useErrorHandler?: boolean;
  continueMiddleware?: boolean;
  /**
   * Optional extra check for `grant_type=password` before the OAuth2 server runs.
   * Omit or `null` to skip — validate credentials in `model.getUser` instead.
   */
  passwordGrantPasswordValidation?: RegExp | null;
};

type OAuthExpressResponse = ExpressResponse & {
  oauth?: {
    token?: OAuth2Server.Token;
    code?: OAuth2Server.AuthorizationCode;
    info?: unknown;
  };
};

const handleResponse = function (
  _req: unknown,
  res: OAuthExpressResponse,
  response: OAuthResponse,
): void {
  const headers = response.headers ?? {};
  if (response.status === 302) {
    const location = headers.location;
    const rest = { ...headers };
    delete rest.location;
    res.set(rest);
    res.redirect(location ?? '/');
  } else {
    res.set(headers);
    res.status(response.status ?? 500).send(response.body);
  }
};

const handleError = function (
  this: ExpressOAuthServer,
  e: unknown,
  _req: ExpressRequest,
  res: OAuthExpressResponse,
  response: OAuthResponse | null,
  next: NextFunction,
): void {
  if (this.useErrorHandler === true) {
    next(e);
    return;
  }
  if (response) {
    res.set(response.headers ?? {});
  }

  if (!(e instanceof OAuth2Server.OAuthError)) {
    next(e);
    return;
  }

  res.status(e.code);

  if (e instanceof UnauthorizedRequestError) {
    res.send();
    return;
  }

  res.send({ error: e.name, error_description: e.message });
};

/**
 * Express middleware wrapper around `@node-oauth/oauth2-server`.
 * Pass `addition` when you need custom token verification (e.g. JWT) in `authenticate`.
 */
export class ExpressOAuthServer {
  useErrorHandler: boolean;
  continueMiddleware: boolean;
  addition: ExpressOAuthServerAddition | undefined;
  server: OAuth2Server;
  passwordGrantPasswordValidation: RegExp | null | undefined;

  constructor(options: ExpressOAuthServerOptions, addition?: ExpressOAuthServerAddition) {
    const opts: ExpressOAuthServerOptions = options || ({} as ExpressOAuthServerOptions);

    if (!opts.model) {
      throw new InvalidArgumentError('Missing parameter: `model`');
    }

    this.useErrorHandler = !!opts.useErrorHandler;
    delete opts.useErrorHandler;

    this.continueMiddleware = !!opts.continueMiddleware;
    delete opts.continueMiddleware;

    this.passwordGrantPasswordValidation = opts.passwordGrantPasswordValidation;
    delete opts.passwordGrantPasswordValidation;

    this.addition = addition;

    this.server = new OAuth2Server(opts);
  }

  authenticate(options?: OAuth2Server.AuthenticateOptions) {
    return async (req: ExpressRequest, res: OAuthExpressResponse, next: NextFunction) => {
      const request = new OAuthRequest(req);
      const response = new OAuthResponse(res);

      try {
        const token = await this.server.authenticate(request, response, options);

        const info = this.addition?.verifyToken?.(token.accessToken, false);

        res.oauth = {
          token,
          ...(info !== undefined ? { info } : {}),
        };

        next();
      } catch (err) {
        handleError.call(this, err, req, res, null, next);
      }
    };
  }

  authorize(options?: OAuth2Server.AuthorizeOptions) {
    return async (req: ExpressRequest, res: OAuthExpressResponse, next: NextFunction) => {
      const request = new OAuthRequest(req);
      const response = new OAuthResponse(res);

      try {
        const code = await this.server.authorize(request, response, options);

        res.oauth = { code };

        if (this.continueMiddleware) {
          next();
          return;
        }

        handleResponse(req, res, response);
      } catch (err) {
        handleError.call(this, err, req, res, response, next);
      }
    };
  }

  token(options?: OAuth2Server.TokenOptions) {
    return async (req: ExpressRequest, res: OAuthExpressResponse, next: NextFunction) => {
      const request = new OAuthRequest(req);
      const response = new OAuthResponse(res);

      const isPasswordGrantType = request.body?.grant_type === 'password';
      const passwordCheck = this.passwordGrantPasswordValidation;

      if (isPasswordGrantType && passwordCheck) {
        const passwordValidation = passwordCheck.exec(
          String(request.body?.password ?? ''),
        );

        if (passwordValidation === null) {
          response.body = {
            error: 'bad params',
            error_description:
              'bad params: Password does not match the regular expression',
          };
          response.status = 400;
          handleResponse(req, res, response);
          return;
        }
      }

      try {
        const token = await this.server.token(request, response, options);

        res.oauth = { token };

        if (this.continueMiddleware) {
          next();
          return;
        }

        handleResponse(req, res, response);
      } catch (err) {
        handleError.call(this, err, req, res, response, next);
      }
    };
  }
}
