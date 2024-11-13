// src/config/database.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI no está definida');
    }

    console.log('Intentando conectar a MongoDB...');

    mongoose.set('strictQuery', false);
    
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('Conexión a MongoDB exitosa');
    
  } catch (error) {
    console.error('Error de conexión:', error.message);
    process.exit(1);
  }
};

export default connectDB;