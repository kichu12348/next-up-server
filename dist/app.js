"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const http_1 = require("http");
// Routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const submissions_routes_1 = __importDefault(require("./routes/submissions.routes"));
const leaderboard_routes_1 = __importDefault(require("./routes/leaderboard.routes"));
// Socket.IO
const socketHandlers_1 = require("./sockets/socketHandlers");
const app = (0, express_1.default)();
exports.app = app;
const server = (0, http_1.createServer)(app);
exports.server = server;
// Initialize Socket.IO
(0, socketHandlers_1.initializeSocket)(server);
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});
const strictLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs for sensitive endpoints
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});
app.use(limiter);
// Apply strict rate limiting to auth endpoints
app.use('/api/auth/request-otp', strictLimiter);
app.use('/api/submissions', (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 3, // limit each IP to 3 submissions per minute
    message: {
        error: 'Too many submissions, please try again later.'
    }
}));
// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'NextUp Backend'
    });
});
// API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/submissions', submissions_routes_1.default);
app.use('/api/leaderboard', leaderboard_routes_1.default);
// Admin routes (with different base path for clarity)
app.use('/api/admin/submissions', submissions_routes_1.default);
app.use('/api/admin/export/leaderboard', leaderboard_routes_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
//# sourceMappingURL=app.js.map