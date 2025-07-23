"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmissionsQuerySchema = exports.LeaderboardQuerySchema = exports.OTPVerifySchema = exports.OTPRequestSchema = exports.SubmissionUpdateSchema = exports.SubmissionCreateSchema = exports.SubmissionStatus = exports.TaskType = void 0;
const zod_1 = require("zod");
exports.TaskType = zod_1.z.enum(['CHALLENGE', 'MENTOR_SESSION', 'SUBJECTIVE_CHALLENGE', 'EASTER_EGG']);
exports.SubmissionStatus = zod_1.z.enum(['PENDING', 'APPROVED', 'REJECTED']);
exports.SubmissionCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required').max(100, 'Name too long'),
    email: zod_1.z.string().email('Invalid email format'),
    taskType: exports.TaskType,
    taskName: zod_1.z.string().min(1, 'Task name is required').max(200, 'Task name too long'),
    fileUrl: zod_1.z.string().url('Invalid URL format'),
});
exports.SubmissionUpdateSchema = zod_1.z.object({
    status: exports.SubmissionStatus,
    points: zod_1.z.number().int().min(0).max(1000).optional(),
    note: zod_1.z.string().max(500, 'Note too long').optional(),
});
exports.OTPRequestSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
});
exports.OTPVerifySchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    otp: zod_1.z.string().length(6, 'OTP must be 6 digits'),
});
exports.LeaderboardQuerySchema = zod_1.z.object({
    page: zod_1.z.string().optional().default('1'),
    limit: zod_1.z.string().optional().default('50'),
});
exports.SubmissionsQuerySchema = zod_1.z.object({
    page: zod_1.z.string().optional().default('1'),
    limit: zod_1.z.string().optional().default('20'),
    status: exports.SubmissionStatus.optional(),
    taskType: exports.TaskType.optional(),
    email: zod_1.z.string().email().optional(),
});
//# sourceMappingURL=validation.js.map