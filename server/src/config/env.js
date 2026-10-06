import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'fallback_dev_access_secret_change_in_production_min_32_chars',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback_dev_refresh_secret_change_in_production_min_32_chars',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  superAdmin: {
    email: (
      process.env.SUPER_ADMIN_EMAIL ||
      (process.env.NODE_ENV === 'production' ? '' : 'superadmin@placementmanagement.local')
    )
      .trim()
      .toLowerCase(),
    password:
      process.env.SUPER_ADMIN_PASSWORD ||
      (process.env.NODE_ENV === 'production' ? '' : 'ChangeMe@12345'),
  },
};

// Validate critical configurations without throwing unhandled exceptions
if (!config.mongodbUri) {
  console.warn('[Configuration Warning] MONGODB_URI is not set. Database connection will not be initialized.');
}

if (config.nodeEnv === 'production') {
  if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
    console.error('[Security Warning] JWT secrets are using fallback values in production! Please define JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in your environment.');
  }
  if (!process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_PASSWORD) {
    console.warn('[Security Warning] SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not explicitly set in production.');
  }
}
