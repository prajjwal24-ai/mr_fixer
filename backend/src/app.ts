import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { auditRouter, handleRescanRequest } from './routes/audit.js';
import type { HealthResponse } from './types.js';

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Health Check Endpoint
  app.get('/api/health', (_req, res) => {
    const isProd = config.NODE_ENV === 'production';
    const payload: HealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      ...(isProd ? {} : { uptime: Math.round(process.uptime() * 100) / 100, environment: config.NODE_ENV }),
    };
    res.status(200).json(payload);
  });

  // Audit Scanner Routes
  app.use('/api/audit', auditRouter);
  app.post('/api/rescan', handleRescanRequest);

  // 404 Catch-All
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
    });
  });

  // Central Error Handler
  app.use(errorHandler);

  return app;
}
