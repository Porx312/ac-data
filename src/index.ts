import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import acServerRoutes from './routes/acServerRoutes.js';

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

// ------------------------ RUTAS ------------------------
app.use('/ac-server', acServerRoutes);

// ------------------------ START SERVER ------------------------
app.listen(PORT, () => {
  console.log(`API corriendo en http://localhost:${PORT}`);
});
