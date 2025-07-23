import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth';
import { 
  createTask, 
  getTasks, 
  updateTask, 
  deleteTask, 
  getAdminStats 
} from '../controllers/tasksController';

const router = Router();

// Apply admin authentication to all routes
router.use(authenticateAdmin);

// Task management routes
router.post('/', createTask);
router.get('/', getTasks);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

// Admin statistics route
router.get('/stats', getAdminStats);

export default router;
