import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import acServerRoutes from './routes/acServerRoutes.js';
import { initDB } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ------------------------ MIDDLEWARE ------------------------
app.use(cors({
  origin: '*', // reemplaza por tu dominio de frontend en Vercel
  methods: ['GET', 'POST'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------------------------ RUTAS & MIDDLEWARES ------------------------
// Middleware de validación de API KEY
const apiKeyMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const providedKey = req.headers['x-api-key'] || req.query.api_key;
  const validKey = process.env.API_KEY;

  if (!validKey) {
    console.warn("⚠️ API_KEY no está definida en el archivo .env. Todas las peticiones serán bloqueadas.");
    return res.status(500).json({ error: "Server Configuration Error: API_KEY missing" });
  }

  if (providedKey !== validKey) {
    return res.status(401).json({ error: "Unauthorized: Invalid API Key" });
  }

  next();
};

app.use('/ac-server', apiKeyMiddleware, acServerRoutes);

// ------------------------ START SERVER ------------------------
app.listen(PORT, async () => {
  await initDB();
  console.log(`API corriendo en http://localhost:${PORT}`);
});
