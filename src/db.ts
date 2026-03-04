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
                server_name VARCHAR(255) NOT NULL,
                webhook_url VARCHAR(255),
                event_type VARCHAR(100),
                metadata JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Base de datos verificada/inicializada (server_events).");
    } catch (err) {
        console.error("❌ Error inicializando la BD:", err);
    }
};

export default pool;
