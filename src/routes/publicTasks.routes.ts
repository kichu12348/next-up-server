import { Router } from 'express';
import { getPublicTasks } from '../controllers/tasksController';

const router = Router();

// Public route to get all tasks (no authentication required)
router.get('/', getPublicTasks);

export default router;
