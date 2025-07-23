"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitSubmissionUpdate = exports.emitLeaderboardUpdate = exports.getSocketIO = exports.initializeSocket = void 0;
const socket_io_1 = require("socket.io");
const db_1 = __importDefault(require("../utils/db"));
let io;
const initializeSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:5173",
            methods: ["GET", "POST"]
        }
    });
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);
        // Join leaderboard room for real-time updates
        socket.join('leaderboard');
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });
    return io;
};
exports.initializeSocket = initializeSocket;
const getSocketIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized');
    }
    return io;
};
exports.getSocketIO = getSocketIO;
const emitLeaderboardUpdate = async () => {
    try {
        if (!io)
            return;
        // Get updated leaderboard data
        const leaderboard = await db_1.default.participant.findMany({
            where: {
                totalPoints: { gt: 0 }
            },
            select: {
                id: true,
                name: true,
                totalPoints: true,
                taskCount: true,
            },
            orderBy: {
                totalPoints: 'desc'
            },
            take: 100 // Top 100 for real-time updates
        });
        const leaderboardWithRank = leaderboard.map((participant, index) => ({
            ...participant,
            rank: index + 1
        }));
        // Emit to all clients in the leaderboard room
        io.to('leaderboard').emit('leaderboard:update', leaderboardWithRank);
        console.log('Leaderboard update emitted to all clients');
    }
    catch (error) {
        console.error('Error emitting leaderboard update:', error);
    }
};
exports.emitLeaderboardUpdate = emitLeaderboardUpdate;
const emitSubmissionUpdate = (submission) => {
    try {
        if (!io)
            return;
        // Emit to admin dashboard (if implemented)
        io.emit('submission:new', submission);
    }
    catch (error) {
        console.error('Error emitting submission update:', error);
    }
};
exports.emitSubmissionUpdate = emitSubmissionUpdate;
//# sourceMappingURL=socketHandlers.js.map