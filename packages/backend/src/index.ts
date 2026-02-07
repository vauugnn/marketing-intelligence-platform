import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import integrationsRoutes from './routes/integrations';
import analyticsRoutes from './routes/analytics';
import pixelRoutes from './routes/pixel';
import oauthRoutes from './routes/oauth';
import syncRoutes from './routes/sync';
import { globalErrorHandler } from './middleware/error-handler.middleware';
import { validateEnv } from './config/env';


// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Validate environment before starting server
validateEnv();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
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
app.use('/api/integrations', integrationsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/pixel', pixelRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/sync', syncRoutes);

// Global error handler (must be after all routes)
app.use(globalErrorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
