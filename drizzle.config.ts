/// <reference types="node" />
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

/**
 * Conexión SOLO para drizzle-kit (push / generate / migrate).
 * Prioridad: DRIZZLE_DATABASE_URL → DIRECT_URL → DATABASE_URL
 *
 * El pooler transaccional :6543 suele fallar en "Pulling schema...". Usa URI directa (5432).
 */
function resolveRawUrl(): string {
    const url =
        process.env.DRIZZLE_DATABASE_URL?.trim() ||
        process.env.DIRECT_URL?.trim() ||
        process.env.DATABASE_URL?.trim();
    if (!url) {
        throw new Error(
            'Define DRIZZLE_DATABASE_URL o DIRECT_URL (Postgres directo :5432) o DATABASE_URL en .env',
        );
    }
    return url;
}

function isBadPoolerForPush(url: string): boolean {
    return url.includes('pooler.supabase.com') && url.includes('6543');
}

/** Credenciales con SSL explícito para Supabase (evita fallos de TLS con solo la URL). */
function buildPostgresCredentials():
    | { url: string }
    | {
          host: string;
          port: number;
          user: string;
          password: string;
          database: string;
          ssl: { rejectUnauthorized: boolean };
      } {
    const raw = resolveRawUrl();

    if (isBadPoolerForPush(raw)) {
        throw new Error(
            'drizzle-kit push no es compatible con el pooler en puerto 6543. ' +
                'En Supabase → Project Settings → Database usa "Direct connection" (host db.PROJECT_REF.supabase.co, puerto 5432) ' +
                'y asígnala a DIRECT_URL o DRIZZLE_DATABASE_URL.',
        );
    }

    const isSupabase = raw.includes('supabase.co') || raw.includes('supabase.com');
    if (!isSupabase) {
        return { url: raw };
    }

    try {
        const u = new URL(raw);
        const database = (u.pathname || '/postgres').replace(/^\//, '') || 'postgres';
        const user = decodeURIComponent(u.username || 'postgres');
        const password = decodeURIComponent(u.password || '');
        const port = u.port ? Number(u.port) : 5432;
        return {
            host: u.hostname,
            port,
            user,
            password,
            database,
            ssl: { rejectUnauthorized: false },
        };
    } catch {
        const sep = raw.includes('?') ? '&' : '?';
        const withSsl = raw.includes('sslmode=') ? raw : `${raw}${sep}sslmode=require`;
        return { url: withSsl };
    }
}

export default defineConfig({
    schema: './src/db/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    /** Solo esquema public (menos trabajo que recorrer todo pg_catalog). */
    schemaFilter: ['public'],
    /**
     * Sin introspección de roles: en Supabase suele alargar o colgar "Pulling schema...".
     * @see https://orm.drizzle.team/kit-docs/config-reference#entities
     */
    entities: {
        roles: false,
    },
    /** Muestra el SQL que evalúa push (útil si parece colgado). */
    verbose: true,
    dbCredentials: buildPostgresCredentials(),
});
