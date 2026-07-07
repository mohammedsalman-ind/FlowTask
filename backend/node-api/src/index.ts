import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import meetingRoutes from './routes/meetings.js';
import notificationRoutes from './routes/notifications.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ---- Middleware ----

app.use(helmet());

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---- Routes ----

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
    error: null,
    status: 200,
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Task routes
app.use('/api/tasks', taskRoutes);

// Meeting routes
app.use('/api/meetings', meetingRoutes);

// Notification routes
app.use('/api/notifications', notificationRoutes);


// ---- 404 handler ----

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    data: null,
    error: 'Route not found',
    status: 404,
  });
});

// ---- Global error handler ----

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    data: null,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    status: 500,
  });
});

// ---- Start server ----

app.listen(PORT, () => {
  console.log(`
  ⚡ FlowTask API running on http://localhost:${PORT}
  📋 Health check:      http://localhost:${PORT}/api/health
  🔐 Auth routes:       http://localhost:${PORT}/api/auth/*
  ✅ Task routes:       http://localhost:${PORT}/api/tasks/*
  `);
});

export default app;
