import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { validateEnv } from './config/env';
import integrationsRoutes from './routes/integrations';
import analyticsRoutes from './routes/analytics';
import pixelRoutes from './routes/pixel';
import oauthRoutes from './routes/oauth';
import syncRoutes from './routes/sync';
import linksRoutes from './routes/links';
import attributionRoutes from './routes/attribution';
import { globalErrorHandler } from './middleware/error-handler.middleware';
import { initializeScheduler } from './jobs/scheduler';

// Validate environment before starting server
validateEnv();

const app = express();
const PORT = process.env.PORT || 3001;

// Pixel routes mounted before global CORS — they handle their own permissive CORS
app.use('/api/pixel', express.json(), pixelRoutes);

// Global middleware (restricted CORS for frontend-only routes)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/oauth', oauthRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/attribution', attributionRoutes);
app.use('/api/links', linksRoutes);
app.use('/s', linksRoutes); // Short link redirect root

// Global error handler (must be after all routes)
app.use(globalErrorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Initialize background job scheduler
  initializeScheduler();
  console.log('Background job scheduler initialized');
});

export default app;
