import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { ConnectionOptions } from 'node:tls';
import { Pool, type PoolConfig } from 'pg';

import type { OAuthDrizzleSchema } from './schema';
import { defineOAuthDrizzleSchema } from './schema';

export type PgSsl = boolean | 'require' | 'allow' | 'prefer' | 'verify-full';

function pgSslOption(ssl: PgSsl | undefined): boolean | ConnectionOptions {
  if (ssl === undefined || ssl === false) return false;
  if (ssl === true) return true;
  if (ssl === 'verify-full') return { rejectUnauthorized: true };
  return { rejectUnauthorized: false };
}

type ConnectionOpts =
  | {
      connectionString: string;
      poolConfig?: Omit<PoolConfig, 'connectionString'>;
    }
  | {
      host: string;
      port: number;
      user: string;
      password: string;
      database: string;
      ssl?: PgSsl;
      poolConfig?: Omit<
        PoolConfig,
        'connectionString' | 'host' | 'port' | 'user' | 'password' | 'database' | 'ssl'
      >;
    };

/**
 * Build `pg.Pool` + Drizzle from **explicit options only** (no `process.env`).
 *
 * **`pgSchema`**: PostgreSQL schema / namespace (default `public`). Tables become `"<pgSchema>"."oauth_clients"`, etc.
 */
export type CreateOAuthDatabaseOptions = ConnectionOpts & {
  pgSchema?: string;
};

export type OAuthDatabaseClient = {
  db: NodePgDatabase<OAuthDrizzleSchema>;
  pool: Pool;
  oauthSchema: OAuthDrizzleSchema;
};

/**
 * Create a `pg` pool and Drizzle client. All connection settings must be passed in `options`.
 * Call `pool.end()` when shutting down the process.
 */
export function createOAuthDatabaseClient(
  options: CreateOAuthDatabaseOptions,
): OAuthDatabaseClient {
  const pgSchemaName = options.pgSchema ?? 'public';
  const oauthSchema = defineOAuthDrizzleSchema(pgSchemaName);

  const pool =
    'connectionString' in options
      ? new Pool({
          connectionString: options.connectionString,
          ...options.poolConfig,
        })
      : new Pool({
          host: options.host,
          port: options.port,
          user: options.user,
          password: options.password,
          database: options.database,
          ssl: pgSslOption(options.ssl),
          ...options.poolConfig,
        });

  const db = drizzle(pool, { schema: oauthSchema });

  return {
    db,
    pool,
    oauthSchema,
  };
}
