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

    await mongoose.connect(mongoUri);

    console.log('MongoDB Conectado');

    mongoose.connection.on('error', (err) => {
      console.error('Error de Mongoose:', err);
    });

  } catch (error) {
    console.error('Error al conectar a MongoDB:', error);
    throw error;
  }
};

export default connectDB;