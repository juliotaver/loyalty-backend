// backend/src/routes/passRoutes.js
import express from 'express';
import { 
  generatePassForClient, 
  downloadPass,
  getLatestPass,
  getSerialNumbers
} from '../controllers/passController.js';

const router = express.Router();

// Rutas principales
router.get('/:clientId/generate', generatePassForClient);
router.get('/:serialNumber/download', downloadPass);

// Rutas para actualizaciones de Apple Wallet
router.get('/v1/passes/:passTypeIdentifier/:serialNumber', getLatestPass);
router.get('/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier', getSerialNumbers);

export default router;