"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSubmission = exports.getAdminSubmissions = exports.getSubmissionsByEmail = exports.createSubmission = void 0;
const db_1 = __importDefault(require("../utils/db"));
const validation_1 = require("../utils/validation");
const emailService_1 = require("../services/emailService");
const socketHandlers_1 = require("../sockets/socketHandlers");
const createSubmission = async (req, res) => {
    try {
        const { name, email, taskType, taskName, fileUrl } = validation_1.SubmissionCreateSchema.parse(req.body);
        // Create or update participant
        const participant = await db_1.default.participant.upsert({
            where: { email },
            create: {
                name,
                email,
            },
            update: {
                name, // Update name in case it changed
            },
        });
        // Create submission
        const submission = await db_1.default.submission.create({
            data: {
                taskName,
                taskType,
                fileUrl,
                participantId: participant.id,
            },
            include: {
                participant: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });
        // Emit submission update
        (0, socketHandlers_1.emitSubmissionUpdate)(submission);
        res.status(201).json({
            message: 'Submission created successfully',
            submission: {
                id: submission.id,
                taskName: submission.taskName,
                taskType: submission.taskType,
                fileUrl: submission.fileUrl,
                status: submission.status,
                createdAt: submission.createdAt,
                participant: submission.participant,
            },
        });
    }
    catch (error) {
        console.error('Create submission error:', error);
        if (error instanceof Error && error.name === 'ZodError') {
            res.status(400).json({ error: 'Invalid input data' });
            return;
        }
        res.status(500).json({ error: 'Failed to create submission' });
    }
};
exports.createSubmission = createSubmission;
const getSubmissionsByEmail = async (req, res) => {
    try {
        const { email } = req.params;
        if (!email) {
            res.status(400).json({ error: 'Email parameter is required' });
            return;
        }
        const participant = await db_1.default.participant.findUnique({
            where: { email },
            include: {
                submissions: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
            },
        });
        if (!participant) {
            res.status(404).json({ error: 'Participant not found' });
            return;
        }
        res.status(200).json({
            participant: {
                name: participant.name,
                email: participant.email,
                totalPoints: participant.totalPoints,
                taskCount: participant.taskCount,
            },
            submissions: participant.submissions,
        });
    }
    catch (error) {
        console.error('Get submissions error:', error);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
};
exports.getSubmissionsByEmail = getSubmissionsByEmail;
const getAdminSubmissions = async (req, res) => {
    try {
        const queryData = validation_1.SubmissionsQuerySchema.parse(req.query);
        const page = parseInt(queryData.page);
        const limit = parseInt(queryData.limit);
        const skip = (page - 1) * limit;
        const where = {};
        if (queryData.status) {
            where.status = queryData.status;
        }
        if (queryData.taskType) {
            where.taskType = queryData.taskType;
        }
        if (queryData.email) {
            where.participant = {
                email: queryData.email,
            };
        }
        const [submissions, total] = await Promise.all([
            db_1.default.submission.findMany({
                where,
                include: {
                    participant: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip,
                take: limit,
            }),
            db_1.default.submission.count({ where }),
        ]);
        res.status(200).json({
            submissions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error('Get admin submissions error:', error);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
};
exports.getAdminSubmissions = getAdminSubmissions;
const updateSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = validation_1.SubmissionUpdateSchema.parse(req.body);
        // Get submission with participant data
        const existingSubmission = await db_1.default.submission.findUnique({
            where: { id },
            include: {
                participant: true,
            },
        });
        if (!existingSubmission) {
            res.status(404).json({ error: 'Submission not found' });
            return;
        }
        // Update submission
        const updatedSubmission = await db_1.default.submission.update({
            where: { id },
            data: updateData,
            include: {
                participant: true,
            },
        });
        // If submission was approved, update participant stats
        if (updateData.status === 'APPROVED' && updateData.points) {
            const pointsDifference = updateData.points - (existingSubmission.points || 0);
            const wasApprovedBefore = existingSubmission.status === 'APPROVED';
            await db_1.default.participant.update({
                where: { id: existingSubmission.participantId },
                data: {
                    totalPoints: {
                        increment: pointsDifference,
                    },
                    taskCount: wasApprovedBefore ? undefined : { increment: 1 },
                },
            });
            // Send approval email
            await (0, emailService_1.sendSubmissionApprovedEmail)(existingSubmission.participant.email, existingSubmission.participant.name, existingSubmission.taskName, updateData.points, updateData.note);
            // Emit leaderboard update
            await (0, socketHandlers_1.emitLeaderboardUpdate)();
        }
        else if (updateData.status === 'REJECTED') {
            // If previously approved, subtract points and decrement task count
            if (existingSubmission.status === 'APPROVED' && existingSubmission.points) {
                await db_1.default.participant.update({
                    where: { id: existingSubmission.participantId },
                    data: {
                        totalPoints: {
                            decrement: existingSubmission.points,
                        },
                        taskCount: {
                            decrement: 1,
                        },
                    },
                });
                // Emit leaderboard update
                await (0, socketHandlers_1.emitLeaderboardUpdate)();
            }
            // Send rejection email
            await (0, emailService_1.sendSubmissionRejectedEmail)(existingSubmission.participant.email, existingSubmission.participant.name, existingSubmission.taskName, updateData.note);
        }
        res.status(200).json({
            message: 'Submission updated successfully',
            submission: updatedSubmission,
        });
    }
    catch (error) {
        console.error('Update submission error:', error);
        if (error instanceof Error && error.name === 'ZodError') {
            res.status(400).json({ error: 'Invalid input data' });
            return;
        }
        res.status(500).json({ error: 'Failed to update submission' });
    }
};
exports.updateSubmission = updateSubmission;
//# sourceMappingURL=submissionsController.js.map