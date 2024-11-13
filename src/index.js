// backend/src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import clientRoutes from './routes/clientRoutes.js';
import passRoutes from './routes/passRoutes.js';
import Client from './models/Client.js';
import { PassService } from './services/passService.js';
import { PassSigningService } from './services/passSigningService.js';
import { createReadStream } from 'fs';

dotenv.config();
const app = express();
const passService = new PassService();
const passSigningService = new PassSigningService();

app.use(cors());
app.use(express.json());

// Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`, {
    headers: req.headers,
    body: req.body
  });
  next();
});

// 1. Obtener pase actualizado
app.get('/v1/passes/:passTypeIdentifier/:serialNumber', async (req, res) => {
  try {
    const { serialNumber } = req.params;
    console.log('Solicitando pase:', serialNumber);

    const client = await Client.findOne({ passSerialNumber: serialNumber });
    if (!client) {
      return res.status(404).send();
    }

    const passDir = await passService.generatePass(client);
    const pkpassPath = await passSigningService.createPassPackage(passDir, serialNumber);

    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Last-Modified', client.lastVisit.toUTCString());
    
    const fileStream = createReadStream(pkpassPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error obteniendo pase:', error);
    res.status(500).send();
  }
});

// 2. Registrar dispositivo
app.post('/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber', async (req, res) => {
  try {
    const { deviceLibraryIdentifier, serialNumber } = req.params;
    const { pushToken } = req.body;

    console.log('Registrando dispositivo:', {
      deviceLibraryIdentifier,
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

    res.status(201).send();
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).send();
  }
});

// 3. Obtener actualizaciones de pases
app.get('/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier', async (req, res) => {
  try {
    const { deviceLibraryIdentifier } = req.params;
    const updatedSince = req.query.passesUpdatedSince 
      ? new Date(req.query.passesUpdatedSince) 
      : new Date(0);

    const passes = await Client.find({
      deviceLibraryIdentifier,
      lastVisit: { $gt: updatedSince }
    });

    res.json({ 
      serialNumbers: passes.map(p => p.passSerialNumber),
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error obteniendo actualizaciones:', error);
    res.status(500).send();
  }
});

// 4. Eliminar registro
app.delete('/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber', async (req, res) => {
  try {
    const { deviceLibraryIdentifier, serialNumber } = req.params;
    
    const client = await Client.findOne({ 
      passSerialNumber: serialNumber,
      deviceLibraryIdentifier
    });

    if (!client) {
      return res.status(404).send();
    }

    client.deviceLibraryIdentifier = undefined;
    client.pushToken = undefined;
    await client.save();

    res.status(200).send();
  } catch (error) {
    console.error('Error eliminando registro:', error);
    res.status(500).send();
  }
});

// 5. Logs de Apple Wallet
app.post('/v1/log', (req, res) => {
  console.log('Log de Apple Wallet:', req.body);
  res.status(200).send();
});

// Rutas API existentes
app.use('/api/clients', clientRoutes);
app.use('/api/passes', passRoutes);

// Iniciar servidor
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`URL base: ${process.env.BACKEND_URL}`);
  });
}).catch(error => {
  console.error('Error conectando a la base de datos:', error);
  process.exit(1);
});