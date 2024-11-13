// backend/src/controllers/deviceController.js
import Client from '../models/Client.js';

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

export const unregisterDevice = async (req, res) => {
  try {
    const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = req.params;

    console.log('Eliminando registro de dispositivo:', {
      deviceLibraryIdentifier,
      passTypeIdentifier,
      serialNumber
    });

    // Verificar que el passTypeIdentifier coincide
    if (passTypeIdentifier !== process.env.PASS_TYPE_IDENTIFIER) {
      return res.status(401).json({
        success: false,
        message: 'Pass Type Identifier no válido'
      });
    }

    // Buscar y actualizar el cliente
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

    // Limpiar información del dispositivo
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