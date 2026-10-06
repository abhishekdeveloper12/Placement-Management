import { config } from '../config/env.js';

export const errorMiddleware = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'An unexpected internal error occurred';
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const details = err.details || [];

  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  const errorPayload = {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };

  // Only include stack trace in development mode for debugging
  if (config.nodeEnv === 'development' && err.stack) {
    errorPayload.error.stack = err.stack;
  }

  return res.status(statusCode).json(errorPayload);
};
