import express from 'express';
import { createSubmission, getSubmissionsByParticipant, getAdminSubmissions, updateSubmission } from '../controllers/submissionsController';
import { authenticateAdmin, authenticateParticipant } from '../middleware/auth';

const router = express.Router();

// Authenticated participant routes
router.post('/', authenticateParticipant, createSubmission);
router.get('/my-submissions', authenticateParticipant, getSubmissionsByParticipant);

export default router;

// Admin routes (separate router)
export const adminSubmissionsRouter = express.Router();
adminSubmissionsRouter.get('/', authenticateAdmin, getAdminSubmissions);
adminSubmissionsRouter.patch('/:id', authenticateAdmin, updateSubmission);
