// backend/src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import clientRoutes from './routes/clientRoutes.js';
import passRoutes from './routes/passRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();

// Configura CORS para permitir peticiones desde el frontend
const corsOptions = {
  origin: ['https://loyalty-frontend-iota.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'API funcionando',
    env: process.env.NODE_ENV,
    mongodb: process.env.MONGODB_URI ? 'configurado' : 'no configurado'
  });
});

// Middleware para logging de requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use('/api/clients', clientRoutes);
app.use('/api/passes', passRoutes);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
      console.log(`CORS configurado para: ${corsOptions.origin.join(', ')}`);
    });
  } catch (error) {
    console.error('Error al iniciar servidor:', error.message);
    process.exit(1);
  }
};

startServer();