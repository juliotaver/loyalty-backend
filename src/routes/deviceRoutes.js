// backend/src/routes/deviceRoutes.js
import express from 'express';
import { registerDevice, unregisterDevice } from '../controllers/deviceController.js';

const router = express.Router();

// Ruta para registrar un dispositivo
router.post(
  '/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber/:pushToken',
  registerDevice
);

// Ruta para eliminar registro de un dispositivo
router.delete(
  '/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber',
  unregisterDevice
);

router.get('/v1/devices/test', testRegistration);

export default router;