import express from 'express';
import { getLeaderboard, exportLeaderboard,exportExcel } from '../controllers/leaderboardController';
import { authenticateAdmin } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/', getLeaderboard);

export default router;

// Admin export router (separate)
export const adminExportRouter = express.Router();
adminExportRouter.get('/leaderboard', authenticateAdmin, exportLeaderboard);
adminExportRouter.get("/excel", authenticateAdmin, exportExcel); // For Excel export
