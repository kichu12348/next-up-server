import { Router } from 'express';
import { requestParticipantOTP, verifyParticipantOTP } from '../controllers/participantController';

const router = Router();

// Participant authentication routes
router.post('/request-otp', requestParticipantOTP);
router.post('/verify-otp', verifyParticipantOTP);

export default router;
