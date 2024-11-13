// src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import clientRoutes from './routes/clientRoutes.js';
import passRoutes from './routes/passRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Endpoint de prueba
app.get('/test', (req, res) => {
  res.json({
    message: 'API funcionando',
    mongodb_status: mongoose.connection.readyState,
    environment: process.env.NODE_ENV,
    mongodb_uri: process.env.MONGODB_URI ? 'Configurada' : 'No configurada'
  });
});

// Rutas estáticas para certificados e imágenes
app.use('/config/certificates', express.static(path.join(__dirname, '../config/certificates')));
app.use('/config/images', express.static(path.join(__dirname, '../config/images')));

// Rutas API
app.use('/api/clients', clientRoutes);
app.use('/api/passes', passRoutes);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
      console.log(`Estado de MongoDB: ${mongoose.connection.readyState}`);
      console.log(`Variables de entorno cargadas: ${Object.keys(process.env).length}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();