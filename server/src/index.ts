import app from './app';
import { config } from './config';
import logger from './config/logger';
import prisma from './config/database';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Import workers so they start with the server
import './jobs/worker';
import './jobs/automationWorker';

const httpServer = createServer(app);

// Socket.IO for real-time inbox updates
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.clientUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  logger.debug(`Socket connected: ${socket.id}`);

  socket.on('join:inbox', (userId: string) => {
    socket.join(`inbox:${userId}`);
    logger.debug(`User ${userId} joined inbox channel`);
  });

  socket.on('join:conversation', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
  });

  socket.on('disconnect', () => {
    logger.debug(`Socket disconnected: ${socket.id}`);
  });
});

// Socket.IO auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    (socket as any).userId = decoded.id;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

// Make io accessible to routes
app.set('io', io);

// Start server
async function start() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected');

    // Ensure admin user exists (from .env credentials)
    await ensureAdminUser();

    httpServer.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port}`);
      logger.info(`📡 Environment: ${config.env}`);
      logger.info(`🌐 Client URL: ${config.clientUrl}`);
      logger.info(`🔗 Webhook URL: ${config.webhookBaseUrl}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function ensureAdminUser() {
  const { email, password, firstName, lastName } = config.admin;
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.user.create({
        data: { email, passwordHash, firstName, lastName, role: 'ADMIN' },
      });
      logger.info(`👤 Admin user auto-created: ${email}`);
    } else {
      logger.debug(`👤 Admin user exists: ${email}`);
    }
  } catch (err) {
    logger.error('Failed to ensure admin user:', err);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  httpServer.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  await prisma.$disconnect();
  httpServer.close(() => {
    process.exit(0);
  });
});

start();

export { io };
