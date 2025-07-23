import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';

// Routes
import authRoutes from './routes/auth.routes';
import participantRoutes from './routes/participant.routes';
import submissionsRoutes, { adminSubmissionsRouter } from './routes/submissions.routes';
import leaderboardRoutes, { adminExportRouter } from './routes/leaderboard.routes';
import devRoutes from './routes/dev.routes';
import tasksRoutes from './routes/tasks.routes';
import publicTasksRoutes from './routes/publicTasks.routes';

// Socket.IO
import { initializeSocket } from './sockets/socketHandlers';

const app = express();
const server = createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// Middleware
app.use(cors({
  origin: "*",
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs for sensitive endpoints
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

app.use(limiter);

// Apply strict rate limiting to auth endpoints
app.use('/api/auth/request-otp', strictLimiter);
app.use('/api/participant/request-otp', strictLimiter);
app.use('/api/submissions', rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // limit each IP to 3 submissions per minute
  message: {
    error: 'Too many submissions, please try again later.'
  }
}));

// Health check
app.get('/health', (_, res: express.Response) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'NextUp Backend'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/participant', participantRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/tasks', publicTasksRoutes);

// Dev routes (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/dev', devRoutes);
}

// Admin routes
app.use('/api/admin/tasks', tasksRoutes);
app.use('/api/admin/submissions', adminSubmissionsRouter);
app.use('/api/admin/export', adminExportRouter);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.get("/", (_, res: express.Response) => {
  res.status(200).json({ message: "Welcome to the NextUp API" });
});

// 404 handler
// app.use('*', (req, res) => {
//   res.status(404).json({ error: 'Route not found' });
// });

export { app, server };
