import mongoose from 'mongoose';
import { config } from './env.js';

let connectionAttempted = false;
let lastConnectionError = null;

export const connectDatabase = async () => {
  connectionAttempted = true;

  if (!config.mongodbUri) {
    console.warn('[Database] MONGODB_URI is not configured. Proceeding in disconnected state.');
    return false;
  }

  try {
    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('[Database] MongoDB connected successfully.');
    lastConnectionError = null;
    return true;
  } catch (error) {
    lastConnectionError = error.message;
    console.error(`[Database Connection Error] Failed to connect to MongoDB: ${error.message}`);
    console.warn('[Database] Please verify that MongoDB is running and MONGODB_URI is valid in your environment configuration.');
    return false;
  }
};

export const getDatabaseStatus = () => {
  if (!config.mongodbUri) {
    return 'unconfigured';
  }

  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const state = states[mongoose.connection.readyState] || 'disconnected';
  return state;
};

export const getDatabaseError = () => lastConnectionError;
