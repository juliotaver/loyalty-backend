// src/config/database.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MongoDB URI no está definida en las variables de entorno');
    }

    console.log('Intentando conectar a MongoDB...');

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };

    await mongoose.connect(mongoUri, options);

    console.log('MongoDB Conectado exitosamente');

    // Manejadores de eventos de conexión
    mongoose.connection.on('connected', () => {
      console.log('Mongoose conectado a MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('Error de conexión de Mongoose:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose desconectado de MongoDB');
    });

  } catch (error) {
    console.error('Error al conectar a MongoDB:', error.message);
    console.error('URI de MongoDB (sin contraseña):', 
      process.env.MONGODB_URI?.replace(/\/\/.*@/, '//***:***@')
    );
    throw error;
  }
};

export default connectDB;