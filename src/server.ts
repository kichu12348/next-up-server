import dotenv from 'dotenv';
import { app, server } from './app';
import prisma from './utils/db';
import { cleanupOTPTimeouts } from './controllers/participantController';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

// Database connection test
const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');
  cleanupOTPTimeouts(); // Clean up OTP timeouts
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const startServer = async () => {
  await connectDB();
  
  server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📊 Socket.IO initialized for real-time updates`);
    console.log(`📧 Email service configured with SendGrid`);
    console.log(`🔐 JWT authentication enabled`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});