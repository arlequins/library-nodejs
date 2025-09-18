# @arlequins/oauth2

## dev

```
npx prisma migrate dev --name init
npx prisma migrate reset
npx prisma db pull --print
```

### production
```
npx prisma migrate dev --name init --create-only
npx prisma migrate deploy
npx prisma migrate status
npx prisma db seed
```

## usage

### middleware

```javascript
router.oauth = new ExpressOAuthServer({
  model: models,
  grants: ['password', 'refresh_token'],
});
```

### router
```javascript
router.post(`/oauth/token`, router.oauth.token(createTokenSettings(true)));

router.get(
  `/oauth/authenticate`,
  router.oauth.authenticate(),
  async (_req, res) => {
    const token = res.oauth.token;
    const scope = token.scope;

    res.json({
      scope,
      email: token.user.email,
      expires: token.accessTokenExpiresAt,
    });
  },
);

router.get(
  `/oauth/userinfo`,
  router.oauth.authenticate(),
  async (_req, res) => {
    const token = res.oauth.token;
    const scope = token.scope;

    res.json({
      scope,
      user_id: token.user.userId,
    });
  },
);
```