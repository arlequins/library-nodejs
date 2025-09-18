import NodeOAuthServer, {
  InvalidArgumentError,
  Request,
  Response,
  UnauthorizedRequestError,
} from '@node-oauth/oauth2-server';

/**
 * Handle response.
 */
const handleResponse = function (_req, res, response) {
  if (response.status === 302) {
    const location = response.headers.location;
    delete response.headers.location;
    res.set(response.headers);
    res.redirect(location);
  } else {
    res.set(response.headers);
    res.status(response.status).send(response.body);
  }
};

/**
 * Handle error.
 */
const handleError = function (e, _req, res, response, next) {
  if (this.useErrorHandler === true) {
    next(e);
  } else {
    if (response) {
      res.set(response.headers);
    }

    res.status(e.code);

    if (e instanceof UnauthorizedRequestError) {
      return res.send();
    }

    res.send({ error: e.name, error_description: e.message });
  }
};

/**
 * Constructor.
 */
function ExpressOAuthServer(options) {
  options = options || {};

  if (!options.model) {
    throw new InvalidArgumentError('Missing parameter: `model`');
  }

  this.useErrorHandler = !!options.useErrorHandler;
  delete options.useErrorHandler;

  this.continueMiddleware = !!options.continueMiddleware;
  delete options.continueMiddleware;

  this.prismaClient = options.prisma;

  this.server = new NodeOAuthServer(options);
}

/**
 * Authentication Middleware.
 * Returns a middleware that will validate a token.
 */
ExpressOAuthServer.prototype.authenticate = function (options) {
  return async (req, res, next) => {
    const request = new Request(req);
    const response = new Response(res);

    try {
      const token = await this.server.authenticate(request, response, options);
      res.oauth = { token: token };
      next();
    } catch (e) {
      handleError.call(this, e, req, res, null, next);
    }
  };
};

/**
 * Authorization Middleware.
 * Returns a middleware that will authorize a client to request tokens.
 */
ExpressOAuthServer.prototype.authorize = function (options) {
  return async (req, res, next) => {
    const request = new Request(req);
    const response = new Response(res);

    try {
      const code = await this.server.authorize(request, response, options);
      res.oauth = { code: code };

      if (this.continueMiddleware) {
        return next();
      }

      handleResponse.call(this, req, res, response);
    } catch (e) {
      handleError.call(this, e, req, res, response, next);
    }
  };
};

/**
 * Grant Middleware.
 * Returns middleware that will grant tokens to valid requests.
 */
ExpressOAuthServer.prototype.token = function (options) {
  return async (req, res, next) => {
    const request = new Request(req);
    const response = new Response(res);

    const isPasswordGrantType = request.body.grant_type === 'password';

    if (isPasswordGrantType) {
      const regex =
        /^(?=.*[A-Za-z])(?=.*\d)[\w!"#$%&'()*+,-./:;<=>?@[\\\]^`{|}~]{10,40}$/;
      const results = regex.exec(request.body.password);

      if (results === null) {
        response.body = {
          error: 'bad params',
          error_description:
            'bad params: Password does not match the regular expression',
        };
        response.status = 400;
        return handleResponse.call(this, req, res, response);
      }
    }

    try {
      const token = await this.server.token(request, response, options);
      res.oauth = { token: token };

      if (this.continueMiddleware) {
        return next();
      }

      handleResponse.call(this, req, res, response);
    } catch (e) {
      handleError.call(this, e, req, res, response, next);
    }
  };
};

/**
 * Export constructor.
 */
export default ExpressOAuthServer;
