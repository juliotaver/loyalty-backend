// backend/src/routes/deviceRoutes.js
import express from 'express';
import { registerDevice, unregisterDevice, testRegistration } from '../controllers/deviceController.js';

const router = express.Router();

// Ruta de prueba
router.get('/v1/devices/test', testRegistration);

// Rutas de registro de dispositivos
router.post(
  '/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber/:pushToken',
  registerDevice
);

router.delete(
  '/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber',
  unregisterDevice
);

export default router;