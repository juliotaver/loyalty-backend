// backend/src/routes/passRoutes.js
import express from 'express';
import { 
  generatePassForClient, 
  generateGooglePassForClient,
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
router.get('/:clientId/google', generateGooglePassForClient);
router.post('/:serialNumber/scan', scanPass);  // Asegúrate de que esta línea esté presente

// Rutas para actualizaciones de Apple Wallet
router.post('/:serialNumber/scan', scanPass);
router.get('/v1/passes/:passTypeIdentifier/:serialNumber', getLatestPass);
router.get('/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier', getSerialNumbers);

export default router;