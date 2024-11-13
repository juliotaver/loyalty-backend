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

    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log(`MongoDB Conectado: ${conn.connection.host}`);
    
    // Eventos de conexión
    mongoose.connection.on('connected', () => {
      console.log('Mongoose conectado a MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('Error de Mongoose:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose desconectado de MongoDB');
    });

    // Manejo de señales de terminación
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Conexión a MongoDB cerrada por terminación de la aplicación');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    console.error('Error al conectar a MongoDB:', error);
    throw error; // Dejamos que el error se propague para que el servidor no inicie si no hay conexión
  }
};

export default connectDB;