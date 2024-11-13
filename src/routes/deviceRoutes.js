// backend/src/routes/deviceRoutes.js
import express from 'express';
import { registerDevice, unregisterDevice, testRegistration } from '../controllers/deviceController.js';

const router = express.Router();

// Ruta de prueba
router.get('/v1/devices/test', testRegistration);

// Rutas de Apple Wallet
router.post(
  '/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber',
  registerDevice
);

router.post('/v1/log', (req, res) => {
  console.log('Log de Apple Wallet:', req.body);
  res.sendStatus(200);
});

// La ruta de registro con pushToken
router.post(
  '/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier',
  registerDevice
);

// Ruta para actualizar visitas
router.post(
  '/:serialNumber/scan',
  async (req, res) => {
    try {
      console.log('Escaneando pase:', req.params.serialNumber);
      const client = await Client.findOne({ passSerialNumber: req.params.serialNumber });
      
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

      console.log(`Visita registrada para ${client.name}, total: ${client.visits}`);

      // Notificar al dispositivo si está registrado
      if (client.pushToken) {
        try {
          const pushService = new PassPushService();
          await pushService.pushUpdate(client.pushToken);
          console.log('Notificación push enviada');
        } catch (pushError) {
          console.error('Error enviando push:', pushError);
        }
      }

      res.json({
        success: true,
        data: {
          visits: client.visits,
          name: client.name,
          nextReward: passService.getNextReward(client.visits)
        }
      });
    } catch (error) {
      console.error('Error en scan:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
);

export default router;