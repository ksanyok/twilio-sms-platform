import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './config';
import logger from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Routes
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import campaignRoutes from './routes/campaigns';
import inboxRoutes from './routes/inbox';
import leadRoutes from './routes/leads';
import pipelineRoutes from './routes/pipeline';
import numberRoutes from './routes/numbers';
import automationRoutes from './routes/automation';
import settingsRoutes from './routes/settings';
import aiRoutes from './routes/ai';

// Webhooks
import twilioWebhooks from './webhooks/twilioWebhooks';

const app = express();

// Security
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for dev
}));

// CORS
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// Logging
app.use(requestLogger);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: config.env, timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/inbox', inboxRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/numbers', numberRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai', aiRoutes);

// Twilio Webhooks (no auth required - validated by Twilio signature)
app.use('/api/webhooks/twilio', twilioWebhooks);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
export default app;
