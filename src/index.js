// backend/src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import clientRoutes from './routes/clientRoutes.js';
import passRoutes from './routes/passRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`, {
    query: req.query,
    params: req.params,
    body: req.body
  });
  next();
});

// Rutas de API
app.use('/api/clients', clientRoutes);
app.use('/api/passes', passRoutes);
// Todas las rutas de Apple Wallet van directamente en /
app.use('/', deviceRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar servidor:', error);
    process.exit(1);
  }
};

startServer();