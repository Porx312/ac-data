import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'ac_server_db',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});


export const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS server_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_id VARCHAR(255) UNIQUE,
                server_name VARCHAR(255) NOT NULL,
                webhook_url VARCHAR(255),
                webhook_secret VARCHAR(255),
                event_type VARCHAR(100),
                event_status VARCHAR(50) DEFAULT 'started',
                metadata JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS server_battles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                battle_id VARCHAR(255) UNIQUE,
                server_name VARCHAR(255) NOT NULL,
                webhook_url VARCHAR(255),
                webhook_secret VARCHAR(255),
                player1_steam_id VARCHAR(255) NOT NULL,
                player2_steam_id VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'active',
                metadata JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Agregar columnas si la tabla ya existía (migración al vuelo)
        const migrations = [
            'ALTER TABLE server_events ADD COLUMN event_id VARCHAR(255) UNIQUE AFTER id',
            'ALTER TABLE server_events ADD COLUMN event_status VARCHAR(50) DEFAULT "started" AFTER event_type',
            'ALTER TABLE server_events ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        ];
        for (const sql of migrations) {
            try {
                await pool.query(sql);
            } catch (colErr) {
                // Ignorar si la columna ya existe
            }
        }

        console.log("✅ Base de datos verificada/inicializada (server_events).");
    } catch (err) {
        console.error("❌ Error inicializando la BD:", err);
    }
};

export default pool;
