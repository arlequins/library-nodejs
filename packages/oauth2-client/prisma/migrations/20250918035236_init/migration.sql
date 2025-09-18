-- CreateTable
CREATE TABLE "oauth2"."oauth_scopes" (
    "oauth_scope_id" SERIAL NOT NULL,
    "scope" VARCHAR(80) NOT NULL,
    "is_default" BOOLEAN NOT NULL,

    CONSTRAINT "oauth_scopes_pkey" PRIMARY KEY ("oauth_scope_id")
);

-- CreateTable
CREATE TABLE "oauth2"."oauth_clients" (
    "oauth_client_id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "client_id" VARCHAR(80) NOT NULL,
    "client_secret" VARCHAR(80) NOT NULL,
    "redirect_uris" TEXT NOT NULL,
    "grant_types" VARCHAR(80) NOT NULL,
    "scope" VARCHAR(80) NOT NULL,

    CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("oauth_client_id")
);

-- CreateTable
CREATE TABLE "oauth2"."oauth_users" (
    "user_id" VARCHAR(50) NOT NULL,
    "password" VARCHAR(500) NOT NULL,
    "scope" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "oauth2"."oauth_refresh_tokens" (
    "oauth_refresh_token_id" SERIAL NOT NULL,
    "refresh_token" VARCHAR(100) NOT NULL,
    "expires" TIMESTAMPTZ(6),
    "scope" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "oauthClientId" INTEGER,
    "userId" TEXT,

    CONSTRAINT "oauth_refresh_tokens_pkey" PRIMARY KEY ("oauth_refresh_token_id")
);

-- CreateTable
CREATE TABLE "oauth2"."oauth_access_tokens" (
    "oauth_access_token_id" SERIAL NOT NULL,
    "access_token" VARCHAR(100) NOT NULL,
    "expires" TIMESTAMPTZ(6),
    "scope" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "oauth_client_id" INTEGER,
    "user_id" VARCHAR(50),

    CONSTRAINT "oauth_access_tokens_pkey" PRIMARY KEY ("oauth_access_token_id")
);

-- CreateTable
CREATE TABLE "oauth2"."users" (
    "user_id" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100),
    "delete_flag" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "oauth2"."oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_oauthClientId_fkey" FOREIGN KEY ("oauthClientId") REFERENCES "oauth2"."oauth_clients"("oauth_client_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth2"."oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "oauth2"."oauth_users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth2"."oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_oauth_client_id_fkey" FOREIGN KEY ("oauth_client_id") REFERENCES "oauth2"."oauth_clients"("oauth_client_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth2"."oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "oauth2"."oauth_users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth2"."users" ADD CONSTRAINT "users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "oauth2"."oauth_users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
