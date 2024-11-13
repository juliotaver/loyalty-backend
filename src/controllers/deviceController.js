// backend/src/controllers/deviceController.js
import Client from '../models/Client.js';

// Función de prueba
export const testRegistration = async (req, res) => {
  try {
    const baseUrl = process.env.BACKEND_URL || 'https://loyalty-backend-production-d6ae.up.railway.app';
    
    const testData = {
      deviceLibraryIdentifier: "test-device",
      passTypeIdentifier: process.env.PASS_TYPE_IDENTIFIER,
      serialNumber: "test-serial",
      pushToken: "test-token"
    };

    console.log('Test de registro con datos:', testData);
    console.log('Variables de entorno:', {
      BACKEND_URL: process.env.BACKEND_URL,
      PASS_TYPE_IDENTIFIER: process.env.PASS_TYPE_IDENTIFIER,
      NODE_ENV: process.env.NODE_ENV
    });

    res.json({
      success: true,
      message: 'Endpoint de registro disponible',
      testData,
      webServiceURL: `${baseUrl}/api`,
      environment: process.env.NODE_ENV,
      routes: {
        register: `${baseUrl}/api/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber/:pushToken`,
        unregister: `${baseUrl}/api/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber`
      }
    });
  } catch (error) {
    console.error('Error en test de registro:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Registro de dispositivo
export const registerDevice = async (req, res) => {
  try {
    const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber, pushToken } = req.params;
    
    console.log('Registrando dispositivo:', {
      deviceLibraryIdentifier,
      passTypeIdentifier,
      serialNumber,
      pushToken
    });

    // Verificar que el passTypeIdentifier coincide
    if (passTypeIdentifier !== process.env.PASS_TYPE_IDENTIFIER) {
      return res.status(401).json({
        success: false,
        message: 'Pass Type Identifier no válido'
      });
    }

    // Buscar y actualizar el cliente
    const client = await Client.findOne({ passSerialNumber: serialNumber });
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Pase no encontrado'
      });
    }

    // Actualizar información del dispositivo
    client.deviceLibraryIdentifier = deviceLibraryIdentifier;
    client.pushToken = pushToken;
    await client.save();

    console.log('Dispositivo registrado exitosamente para:', client.name);

    res.status(201).json({
      success: true,
      message: 'Dispositivo registrado exitosamente'
    });

  } catch (error) {
    console.error('Error registrando dispositivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar dispositivo',
      error: error.message
    });
  }
};

// Eliminación de registro
export const unregisterDevice = async (req, res) => {
  try {
    const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = req.params;

    console.log('Eliminando registro de dispositivo:', {
      deviceLibraryIdentifier,
      passTypeIdentifier,
      serialNumber
    });

    if (passTypeIdentifier !== process.env.PASS_TYPE_IDENTIFIER) {
      return res.status(401).json({
        success: false,
        message: 'Pass Type Identifier no válido'
      });
    }

    const client = await Client.findOne({ 
      passSerialNumber: serialNumber,
      deviceLibraryIdentifier: deviceLibraryIdentifier
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Registro no encontrado'
      });
    }

    client.deviceLibraryIdentifier = undefined;
    client.pushToken = undefined;
    await client.save();

    console.log('Dispositivo eliminado exitosamente para:', client.name);

    res.status(200).json({
      success: true,
      message: 'Dispositivo eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando dispositivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar dispositivo',
      error: error.message
    });
  }
};