// backend/src/controllers/passController.js
import { PassService } from '../services/passService.js';
import { PassSigningService } from '../services/passSigningService.js';
import { PassPushService } from '../services/passPushService.js';  // Añadir esta importación
import Client from '../models/Client.js';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const passService = new PassService();
const passSigningService = new PassSigningService();
const passPushService = new PassPushService(); 

// Generar pase para cliente
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

    const baseUrl = process.env.BACKEND_URL || 'https://loyalty-backend-production-d6ae.up.railway.app';
    const passUrl = `${baseUrl}/api/passes/${client.passSerialNumber}/download`;

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

// Descargar pase
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

// Escanear y actualizar visitas
export const scanPass = async (req, res) => {
  try {
    const { serialNumber } = req.params;
    
    console.log('Escaneando pase:', serialNumber);

    const client = await Client.findOne({ passSerialNumber: serialNumber });
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Pase no encontrado'
      });
    }

    // Incrementar visitas
    client.visits = (client.visits + 1) % 26;
    client.lastVisit = new Date();
    await client.save();

    console.log(`Visita registrada para: ${client.name} Total visitas: ${client.visits}`);

    // Si el cliente tiene un pushToken, enviar notificación
    if (client.pushToken) {
      try {
        await passPushService.pushUpdate(client.pushToken);
        console.log('Notificación push enviada correctamente');
      } catch (pushError) {
        console.error('Error en notificación push:', pushError);
      }
    }

    // Responder al cliente
    res.json({
      success: true,
      data: {
        visits: client.visits,
        name: client.name,
        nextReward: passService.getNextReward(client.visits)
      }
    });

  } catch (error) {
    console.error('Error al escanear pase:', error);
    res.status(500).json({
      success: false,
      message: 'Error al escanear el pase',
      error: error.message
    });
  }
};

// Obtener último pase
export const getLatestPass = async (req, res) => {
  try {
    const { serialNumber } = req.params;
    const client = await Client.findOne({ passSerialNumber: serialNumber });
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
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
    console.error('Error al obtener el último pase:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el último pase',
      error: error.message
    });
  }
};

// Obtener números de serie de pases actualizados
export const getSerialNumbers = async (req, res) => {
  try {
    const passesUpdatedSince = req.query.passesUpdatedSince 
      ? new Date(req.query.passesUpdatedSince) 
      : new Date(0);

    const clients = await Client.find({
      lastVisit: { $gt: passesUpdatedSince }
    });

    const serialNumbers = clients.map(client => client.passSerialNumber);

    res.json({
      serialNumbers,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al obtener números de serie:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener números de serie',
      error: error.message
    });
  }
};