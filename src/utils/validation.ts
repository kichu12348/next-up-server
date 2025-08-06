import { z } from 'zod';

export const TaskType = z.enum(['CHALLENGE', 'MENTOR_SESSION', 'POWERUP_CHALLENGE', 'EASTER_EGG']);
export const SubmissionStatus = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

export const SubmissionCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.email('Invalid email format'),
  taskType: TaskType,
  taskName: z.string().min(1, 'Task name is required').max(200, 'Task name too long'),
  fileUrl: z.url('Invalid URL format'),
});

export const SubmissionUpdateSchema = z.object({
  status: SubmissionStatus,
  points: z.number().int().min(0).max(1000).optional(),
  note: z.string().max(500, 'Note too long').optional(),
});

export const OTPRequestSchema = z.object({
  email: z.email('Invalid email format'),
});

export const ParticipantOTPRequestSchema = z.object({
  email: z.email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  college: z.string().min(1, 'College is required').max(200, 'College name too long').optional(),
  gender: z.enum(['Male', 'Female']).optional(),
});

export const OTPVerifySchema = z.object({
  email: z.email('Invalid email format'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const LeaderboardQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
});

export const SubmissionsQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  status: SubmissionStatus.optional(),
  taskType: TaskType.optional(),
  email: z.email().optional(),
});

export const ParticipantUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  college: z.string().min(1, 'College is required').max(200, 'College name too long').optional(),
  gender: z.enum(['Male', 'Female']).optional(),
});

export type SubmissionCreateData = z.infer<typeof SubmissionCreateSchema>;
export type SubmissionUpdateData = z.infer<typeof SubmissionUpdateSchema>;
export type OTPRequestData = z.infer<typeof OTPRequestSchema>;
export type ParticipantOTPRequestData = z.infer<typeof ParticipantOTPRequestSchema>;
export type OTPVerifyData = z.infer<typeof OTPVerifySchema>;
export type LeaderboardQuery = z.infer<typeof LeaderboardQuerySchema>;
export type SubmissionsQuery = z.infer<typeof SubmissionsQuerySchema>;
