import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import apiRouter from './routes/index.js';
import { notFoundMiddleware } from './middleware/notFound.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';

const app = express();

// CORS configuration based on environment
const allowedOrigins = config.corsOrigin
  ? config.corsOrigin.split(',').map((origin) => origin.trim())
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      return callback(new Error(`CORS policy violation: origin ${origin} is not allowed`));
    },
    credentials: true,
  })
);

// Standard JSON request body and cookie parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Mount API routes under /api
app.use('/api', apiRouter);

// 404 handler for unmatched routes
app.use(notFoundMiddleware);

// Global error handler
app.use(errorMiddleware);

export default app;
