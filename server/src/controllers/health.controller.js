import { config } from '../config/env.js';
import { getDatabaseStatus } from '../config/db.js';

export const getHealth = (req, res) => {
  const dbStatus = getDatabaseStatus();

  return res.status(200).json({
    success: true,
    message: 'Placement Management System API is running',
    environment: config.nodeEnv,
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
};
