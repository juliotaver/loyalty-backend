// backend/src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import clientRoutes from './routes/clientRoutes.js';
import passRoutes from './routes/passRoutes.js';
import Client from './models/Client.js';

dotenv.config();
const app = express();

// Conexión a la base de datos
connectDB();

app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`, {
    headers: req.headers,
    query: req.query,
    params: req.params,
    body: req.body
  });
  next();
});

// Rutas de Apple Wallet
app.post('/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber', async (req, res) => {
  try {
    const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = req.params;
    const { pushToken } = req.body;

    console.log('Registrando dispositivo:', {
      deviceLibraryIdentifier,
      passTypeIdentifier,
      serialNumber,
      pushToken,
      headers: req.headers,
      body: req.body
    });

    const client = await Client.findOne({ passSerialNumber: serialNumber });
    if (!client) {
      console.log('Cliente no encontrado:', serialNumber);
      return res.sendStatus(404);
    }

    client.deviceLibraryIdentifier = deviceLibraryIdentifier;
    client.pushToken = pushToken;
    await client.save();

    console.log('Dispositivo registrado:', client.name);
    res.sendStatus(201);
  } catch (error) {
    console.error('Error en registro:', error);
    res.sendStatus(500);
  }
});

app.get('/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier', async (req, res) => {
  try {
    const { deviceLibraryIdentifier } = req.params;
    const passes = await Client.find({ deviceLibraryIdentifier });
    res.json({ serialNumbers: passes.map(p => p.passSerialNumber) });
  } catch (error) {
    res.sendStatus(500);
  }
});

app.post('/v1/log', (req, res) => {
  console.log('Log de Apple Wallet:', req.body);
  res.sendStatus(200);
});

// Otras rutas API
app.use('/api/clients', clientRoutes);
app.use('/api/passes', passRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});