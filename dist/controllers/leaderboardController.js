"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportLeaderboard = exports.getLeaderboard = void 0;
const db_1 = __importDefault(require("../utils/db"));
const validation_1 = require("../utils/validation");
const getLeaderboard = async (req, res) => {
    try {
        const queryData = validation_1.LeaderboardQuerySchema.parse(req.query);
        const page = parseInt(queryData.page);
        const limit = parseInt(queryData.limit);
        const skip = (page - 1) * limit;
        const [participants, total] = await Promise.all([
            db_1.default.participant.findMany({
                where: {
                    totalPoints: { gt: 0 },
                },
                select: {
                    id: true,
                    name: true,
                    totalPoints: true,
                    taskCount: true,
                },
                orderBy: {
                    totalPoints: 'desc',
                },
                skip,
                take: limit,
            }),
            db_1.default.participant.count({
                where: {
                    totalPoints: { gt: 0 },
                },
            }),
        ]);
        // Add rank to each participant
        const leaderboard = participants.map((participant, index) => ({
            ...participant,
            rank: skip + index + 1,
        }));
        res.status(200).json({
            leaderboard,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
};
exports.getLeaderboard = getLeaderboard;
const exportLeaderboard = async (req, res) => {
    try {
        const participants = await db_1.default.participant.findMany({
            where: {
                totalPoints: { gt: 0 },
            },
            select: {
                name: true,
                email: true,
                totalPoints: true,
                taskCount: true,
                createdAt: true,
            },
            orderBy: {
                totalPoints: 'desc',
            },
        });
        // Generate CSV content
        const csvHeader = 'Rank,Name,Email,Total Points,Task Count,Join Date\n';
        const csvContent = participants
            .map((participant, index) => {
            const rank = index + 1;
            const joinDate = participant.createdAt.toISOString().split('T')[0];
            return `${rank},"${participant.name}","${participant.email}",${participant.totalPoints},${participant.taskCount},${joinDate}`;
        })
            .join('\n');
        const csv = csvHeader + csvContent;
        // Set response headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="leaderboard.csv"');
        res.status(200).send(csv);
    }
    catch (error) {
        console.error('Export leaderboard error:', error);
        res.status(500).json({ error: 'Failed to export leaderboard' });
    }
};
exports.exportLeaderboard = exportLeaderboard;
//# sourceMappingURL=leaderboardController.js.map