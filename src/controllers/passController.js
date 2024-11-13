import { PassService } from '../services/passService.js';
import { PassSigningService } from '../services/passSigningService.js';
import Client from '../models/Client.js';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { getTempPath } from '../utils/paths.js';

const passService = new PassService();
const passSigningService = new PassSigningService();

export const downloadPass = async (req, res) => {
  try {
    const { serialNumber } = req.params;
    
    const client = await Client.findOne({ passSerialNumber: serialNumber });
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Pase no encontrado'
      });
    }

    const passDir = await passService.generatePass(client);
    const pkpassPath = await passSigningService.createPassPackage(passDir, serialNumber);

    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', `attachment; filename=${serialNumber}.pkpass`);
    
    const fileStream = createReadStream(pkpassPath);
    fileStream.pipe(res);

    fileStream.on('end', async () => {
      try {
        setTimeout(async () => {
          await fs.rm(passDir, { recursive: true });
        }, 1000);
      } catch (error) {
        console.error('Error al limpiar archivos temporales:', error);
      }
    });
  } catch (error) {
    console.error('Error al descargar el pase:', error);
    res.status(500).json({
      success: false,
      message: 'Error al descargar el pase',
      error: error.message
    });
  }
};

export const generatePassForClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    const passUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/passes/${client.passSerialNumber}/download`;
    const qrCode = await QRCode.toDataURL(passUrl);

    res.json({
      success: true,
      data: {
        passUrl,
        qrCode,
        clientId: client._id,
        serialNumber: client.passSerialNumber
      }
    });
  } catch (error) {
    console.error('Error al generar el pase:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar el pase',
      error: error.message
    });
  }
};
export const scanPass = async (req, res) => {
  try {
    const { serialNumber } = req.params;
    
    // Buscar el cliente por el número de serie del pase
    const client = await Client.findOne({ passSerialNumber: serialNumber });
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Incrementar visitas
    client.visits = (client.visits + 1) % 26; // Reset a 0 después de 25 visitas
    client.lastVisit = new Date();
    await client.save();

    // Generar y enviar el pase actualizado
    const passDir = await passService.generatePass(client);
    const pkpassPath = await passSigningService.createPassPackage(passDir, serialNumber);

    // Primero enviamos la respuesta JSON con la información actualizada
    res.json({
      success: true,
      data: {
        visits: client.visits,
        name: client.name,
        nextReward: passService.getNextReward(client.visits)
      }
    });

    // Limpiar archivos temporales
    setTimeout(async () => {
      try {
        await fs.rm(passDir, { recursive: true });
      } catch (error) {
        console.error('Error al limpiar archivos temporales:', error);
      }
    }, 1000);
  } catch (error) {
    console.error('Error al escanear el pase:', error);
    res.status(500).json({
      success: false,
      message: 'Error al escanear el pase',
      error: error.message
    });
  }
};

// Endpoints requeridos por Apple Wallet para actualizaciones automáticas
export const getSerialNumbers = async (req, res) => {
  try {
    const passTypeId = process.env.PASS_TYPE_IDENTIFIER;
    const deviceLibraryId = req.get('Authorization').split(' ')[1];
    const passesForDevice = req.query.passesUpdatedSince 
      ? { lastUpdated: { $gt: new Date(req.query.passesUpdatedSince) } }
      : {};

    const clients = await Client.find(passesForDevice);
    const serialNumbers = clients.map(client => client.passSerialNumber);

    res.json({
      serialNumbers,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getLatestPass = async (req, res) => {
  try {
    const { serialNumber } = req.params;
    const deviceLibraryId = req.get('Authorization').split(' ')[1];

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

    fileStream.on('end', async () => {
      try {
        setTimeout(async () => {
          await fs.rm(passDir, { recursive: true });
        }, 1000);
      } catch (error) {
        console.error('Error al limpiar archivos temporales:', error);
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
