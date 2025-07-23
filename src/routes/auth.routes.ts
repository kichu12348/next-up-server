import express from 'express';
import { requestOTP, verifyOTP, checkAdminEmail, validateAdminToken, validateParticipantToken } from '../controllers/authController';

const router = express.Router();

router.post('/check-admin', checkAdminEmail);
router.post('/request-otp', requestOTP);
router.post('/verify-otp', verifyOTP);
router.get('/validate-admin-token', validateAdminToken);
router.get('/validate-participant-token', validateParticipantToken);

export default router;
