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
import { ApiError } from './utils/apiError';

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

io.on('connection', (socket) => {
  console.info(`[Socket]: Client connected: ${socket.id}`);

  socket.on('join-repo', (repoId) => {
    socket.join(repoId);
    console.info(`[Socket]: Client ${socket.id} joined repo: ${repoId}`);
  });

  socket.on('disconnect', () => {
    console.info(`[Socket]: Client disconnected: ${socket.id}`);
  });
});

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
// app.use(`${API_BASE_PATH}/conflicts`, conflictRoutes);

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
