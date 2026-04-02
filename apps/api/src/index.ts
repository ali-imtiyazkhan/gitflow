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
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use(`${API_BASE_PATH}/repos`, repoRoutes);
app.use(`${API_BASE_PATH}/repos`, mergeRoutes);
app.use(`${API_BASE_PATH}/repos`, approvalRouter);
app.use(`${API_BASE_PATH}/repos`, prRouter);
app.use(`${API_BASE_PATH}/webhooks`, webhookRouter);
app.use(`${API_BASE_PATH}/repos`, webhookRouter); // Also mount events here

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
