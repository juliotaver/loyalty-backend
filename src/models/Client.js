// backend/src/models/Client.js
import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  visits: {
    type: Number,
    default: 0
  },
  passSerialNumber: {
    type: String,
    unique: true
  },
  deviceLibraryIdentifier: {
    type: String
  },
  pushToken: {
    type: String
  },
  lastVisit: {
    type: Date,
    default: Date.now
  }
});

const Client = mongoose.model('Client', clientSchema);

export default Client;