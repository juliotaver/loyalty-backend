// backend/src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import clientRoutes from './routes/clientRoutes.js';
import passRoutes from './routes/passRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';
import Client from './models/Client.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Logging mejorado
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`, {
    headers: req.headers,
    query: req.query,
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
      pushToken
    });

    const client = await Client.findOne({ passSerialNumber: serialNumber });
    if (!client) {
      return res.status(404).send();
    }

    client.deviceLibraryIdentifier = deviceLibraryIdentifier;
    client.pushToken = pushToken;
    await client.save();

    res.sendStatus(201);
  } catch (error) {
    console.error('Error en registro:', error);
    res.sendStatus(500);
  }
});

app.delete('/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber', async (req, res) => {
  try {
    const { deviceLibraryIdentifier, serialNumber } = req.params;
    
    const client = await Client.findOne({ 
      passSerialNumber: serialNumber,
      deviceLibraryIdentifier: deviceLibraryIdentifier 
    });

    if (!client) {
      return res.sendStatus(404);
    }

    client.deviceLibraryIdentifier = undefined;
    client.pushToken = undefined;
    await client.save();

    res.sendStatus(200);
  } catch (error) {
    console.error('Error en unregister:', error);
    res.sendStatus(500);
  }
});

// Log endpoint
app.post('/v1/log', (req, res) => {
  console.log('Log de Apple Wallet:', req.body);
  res.sendStatus(200);
});

// Rutas API
app.use('/api/clients', clientRoutes);
app.use('/api/passes', passRoutes);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
      console.log(`URL base: ${process.env.BACKEND_URL}`);
    });
  } catch (error) {
    console.error('Error al iniciar servidor:', error);
    process.exit(1);
  }
};

startServer();