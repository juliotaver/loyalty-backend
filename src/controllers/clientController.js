// backend/src/controllers/clientController.js
import Client from '../models/Client.js';
import { generateSerialNumber } from '../utils/helpers.js';

export const createClient = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // Verificar si el cliente ya existe
    let client = await Client.findOne({ email });
    
    if (client) {
      return res.status(400).json({
        success: false,
        message: 'El cliente ya existe con este correo electrónico'
      });
    }

    // Crear nuevo cliente
    client = new Client({
      name,
      email,
      phone,
      passSerialNumber: generateSerialNumber()
    });

    await client.save();

    res.status(201).json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el cliente',
      error: error.message
    });
  }
};

export const updateVisits = async (req, res) => {
  try {
    const { clientId } = req.params;
    const client = await Client.findById(clientId);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Incrementar visitas
    client.visits += 1;
    client.lastVisit = new Date();

    // Determinar si el cliente ha alcanzado alguna recompensa
    let reward = null;
    switch (client.visits) {
      case 5:
        reward = 'Postre gratis';
        break;
      case 10:
        reward = 'Bebida gratis';
        break;
      case 15:
        reward = 'Gel liso en manos';
        break;
      case 20:
        reward = 'Gel liso en pies';
        break;
      case 25:
        reward = '10% descuento en uñas';
        break;
    }

    await client.save();

    res.json({
      success: true,
      data: {
        client,
        reward
      }
    });
  } catch (error) {
    console.error('Error al actualizar visitas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar visitas',
      error: error.message
    });
  }
};

// Función para obtener todos los clientes
export const getAllClients = async (req, res) => {
  try {
    const clients = await Client.find({})
      .sort({ lastVisit: -1 }); // Ordenar por última visita, más reciente primero

    res.json({
      success: true,
      data: clients
    });
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener clientes',
      error: error.message
    });
  }
};

// Función para obtener estadísticas de clientes
export const getClientStats = async (req, res) => {
  try {
    const totalClients = await Client.countDocuments();
    
    // Visitas de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayVisits = await Client.countDocuments({
      lastVisit: { $gte: today }
    });

    // Clientes frecuentes (10+ visitas)
    const frequentClients = await Client.countDocuments({
      visits: { $gte: 10 }
    });

    // Total de recompensas ganadas
    const clients = await Client.find({}, 'visits');
    const totalRewards = clients.reduce((acc, client) => {
      return acc + Math.floor(client.visits / 5);
    }, 0);

    res.json({
      success: true,
      data: {
        totalClients,
        todayVisits,
        frequentClients,
        totalRewards
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};