import express from 'express';
import { 
  generatePassForClient, 
  downloadPass, 
  scanPass,
  getSerialNumbers,
  getLatestPass
} from '../controllers/passController.js';

const router = express.Router();

// Rutas existentes
router.get('/:clientId/generate', generatePassForClient);
router.get('/:serialNumber/download', downloadPass);

// Nueva ruta para escanear
router.post('/:serialNumber/scan', scanPass);

// Rutas requeridas por Apple Wallet
router.get('/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier', getSerialNumbers);
router.get('/v1/passes/:passTypeIdentifier/:serialNumber', getLatestPass);

export default router;