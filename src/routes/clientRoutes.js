import express from 'express';
import { createClient, updateVisits } from '../controllers/clientController.js'; // Agrega updateVisits aquí

const router = express.Router();

router.post('/', createClient);
router.post('/:clientId/visits', updateVisits);

export default router;