// backend/src/routes/clientRoutes.js
import express from 'express';
import { 
  getAllClients,
  getClientStats,
  createClient,
  updateVisits
} from '../controllers/clientController.js';

const router = express.Router();

// Obtener todos los clientes
router.get('/', getAllClients);

// Obtener estadísticas de clientes
router.get('/stats', getClientStats);

// Crear nuevo cliente
router.post('/', createClient);

// Actualizar visitas de un cliente
router.put('/:clientId/visits', updateVisits);

export default router;