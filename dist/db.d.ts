import { Pool } from 'pg';
import * as schema from './db/schema.js';
declare const pool: Pool;
export declare const db: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
    $client: Pool;
};
export { pool };
export declare const initDB: () => Promise<void>;
//# sourceMappingURL=db.d.ts.map