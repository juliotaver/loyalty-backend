// backend/src/routes/passRoutes.js
import express from 'express';
import { 
  generatePassForClient, 
  downloadPass,
  scanPass,
  getLatestPass,
  getSerialNumbers
} from '../controllers/passController.js';

const router = express.Router();

router.post('/test-scan', (req, res) => {
  res.json({
    success: true,
    message: 'Ruta de escaneo funcionando',
    timestamp: new Date().toISOString()
  });
});


// Rutas básicas de pases
router.get('/:clientId/generate', generatePassForClient);
router.get('/:serialNumber/download', downloadPass);
router.post('/:serialNumber/scan', scanPass);  // Asegúrate de que esta línea esté presente

// Rutas para actualizaciones de Apple Wallet
router.get('/v1/passes/:passTypeIdentifier/:serialNumber', getLatestPass);
router.get('/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier', getSerialNumbers);

export default router;