// backend/src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import clientRoutes from './routes/clientRoutes.js';
import passRoutes from './routes/passRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Conectar a MongoDB
connectDB();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Rutas estáticas para certificados e imágenes
app.use('/config/certificates', express.static(path.join(__dirname, '../config/certificates')));
app.use('/config/images', express.static(path.join(__dirname, '../config/images')));

// Rutas API
app.use('/api/clients', clientRoutes);
app.use('/api/passes', passRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});