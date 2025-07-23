"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = require("./app");
const db_1 = __importDefault(require("./utils/db"));
// Load environment variables
dotenv_1.default.config();
const PORT = process.env.PORT || 3000;
// Database connection test
const connectDB = async () => {
    try {
        await db_1.default.$connect();
        console.log('✅ Database connected successfully');
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
};
// Graceful shutdown
const gracefulShutdown = async () => {
    console.log('Shutting down gracefully...');
    await db_1.default.$disconnect();
    process.exit(0);
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
// Start server
const startServer = async () => {
    await connectDB();
    app_1.server.listen(PORT, () => {
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
//# sourceMappingURL=server.js.map