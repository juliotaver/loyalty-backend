// backend/src/controllers/passController.js
import { PassService } from '../services/passService.js';
import { PassSigningService } from '../services/passSigningService.js';
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

    // Usar la URL base del backend de producción
    const baseUrl = process.env.BACKEND_URL || 'https://loyalty-backend-production-d6ae.up.railway.app';
    const passUrl = `${baseUrl}/api/passes/${client.passSerialNumber}/download`;

    // Generar código QR
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

    // Generar el pase
    const passDir = await passService.generatePass(client);
    const pkpassPath = await passSigningService.createPassPackage(passDir, serialNumber);

    // Configurar headers para la descarga
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', `attachment; filename=${serialNumber}.pkpass`);
    
    // Enviar el archivo
    const fileStream = createReadStream(pkpassPath);
    fileStream.pipe(res);

    // Limpiar archivos temporales después de enviar
    fileStream.on('end', async () => {
      try {
        setTimeout(async () => {
          await fs.rm(passDir, { recursive: true });
        }, 1000);
      } catch (error) {
        console.error('Error al limpiar archivos temporales:', error);
      }
    });

    // Manejar errores en el stream
    fileStream.on('error', (error) => {
      console.error('Error al enviar el archivo:', error);
      res.status(500).json({
        success: false,
        message: 'Error al enviar el pase'
      });
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