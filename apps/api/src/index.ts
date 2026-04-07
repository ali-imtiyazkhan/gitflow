import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { API_BASE_PATH } from '@gitflow/shared';
import repoRoutes from '@/routes/repoRoutes';
import mergeRoutes from '@/routes/mergeRoutes';
import approvalRouter from '@/routes/approvalRoutes';
import webhookRouter from '@/routes/webhookRoutes';
import prRouter from '@/routes/prRoutes';
import { ApiError } from './utils/apiError';
import { UnauthorizedError } from './utils/apiError';
import { registerSocketHandlers } from './services/socketHandlers';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const port = process.env.PORT || 4000;

// ─── Socket.io ───────────────────────────────────────────────────────────────

registerSocketHandlers(io);

// Make io accessible to routes
app.set('io', io);

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('dev'));

// Parse JSON with raw body preservation for webhook signature verification
app.use(express.json({
  verify: (req: any, _res, buf) => {
    // Store the raw body buffer on the request for HMAC verification
    req.rawBody = buf;
  },
}));

// ─── Auth Middleware ──────────────────────────────────────────────────────────

/**
 * Extract and validate Bearer token from Authorization header.
 * Attaches `req.accessToken` for downstream handlers.
 * Applied to all /repos routes. Webhook routes are excluded.
 */
function authMiddleware(req: express.Request, _res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }
  (req as any).accessToken = authHeader.split(' ')[1];
  next();
}

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// Protected routes — require Bearer token
app.use(`${API_BASE_PATH}/repos`, authMiddleware, repoRoutes);
app.use(`${API_BASE_PATH}/repos`, authMiddleware, mergeRoutes);
app.use(`${API_BASE_PATH}/repos`, authMiddleware, approvalRouter);
app.use(`${API_BASE_PATH}/repos`, authMiddleware, prRouter);

// Webhook routes — no auth required (uses signature verification instead)
app.use(`${API_BASE_PATH}/webhooks`, webhookRouter);

// Event replay/history routes (under /repos, needs auth)
app.use(`${API_BASE_PATH}/repos`, authMiddleware, webhookRouter);

// ─── Error Handling ───────────────────────────────────────────────────────────

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  console.error('[API Internal Error]:', err);
  
  const statusCode = err.status || 500;
  const message = err.message || 'An unexpected error occurred';
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

httpServer.listen(port, () => {
  console.info(`[API]: Server running at http://localhost:${port}`);
  console.info(`[API]: Base path is ${API_BASE_PATH}`);
});

export default app;
