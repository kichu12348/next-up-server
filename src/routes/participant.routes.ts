import { Router } from "express";
import {
  requestParticipantOTP,
  verifyParticipantOTP,
  updateParticipantProfile,
} from "../controllers/participantController";
import { authenticateParticipant } from "../middleware/auth";

const router = Router();

// Participant authentication routes
router.post("/request-otp", requestParticipantOTP);
router.post("/verify-otp", verifyParticipantOTP);
router.put("/profile", authenticateParticipant, updateParticipantProfile);

export default router;
