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
  lastVisit: {
    type: Date,
    default: Date.now
  },
  deviceLibraryIdentifier: {
    type: String
  }
});

const Client = mongoose.model('Client', clientSchema);

export default Client;