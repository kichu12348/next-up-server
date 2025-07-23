import { Request, Response } from 'express';
import prisma from '../utils/db';
import { AuthRequest } from '../middleware/auth';

export interface TaskData {
  name: string;
  description: string;
  type: 'CHALLENGE' | 'MENTOR_SESSION' | 'SUBJECTIVE_CHALLENGE' | 'EASTER_EGG';
  points: number;
  isVariablePoints: boolean;
}

export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, type, points, isVariablePoints }: TaskData = req.body;

    if (!name?.trim() || !description?.trim()) {
      res.status(400).json({ error: 'Name and description are required' });
      return;
    }

    if (!isVariablePoints && (!points || points <= 0)) {
      res.status(400).json({ error: 'Valid points value is required for fixed point tasks' });
      return;
    }

    // Create task in database
    const task = await prisma.task.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        type,
        points: isVariablePoints ? 0 : points,
        isVariablePoints,
      }
    });

    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
};

export const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Fetch tasks from database
    const tasks = await prisma.task.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.status(200).json({
      tasks,
      total: tasks.length
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, type, points, isVariablePoints }: Partial<TaskData> = req.body;

    if (!id) {
      res.status(400).json({ error: 'Task ID is required' });
      return;
    }

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: { id }
    });

    if (!existingTask) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Update task in database
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (type !== undefined) updateData.type = type;
    if (points !== undefined) updateData.points = points;
    if (isVariablePoints !== undefined) updateData.isVariablePoints = isVariablePoints;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData
    });

    res.status(200).json({
      message: 'Task updated successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Task ID is required' });
      return;
    }

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: { id }
    });

    if (!existingTask) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Delete task from database
    await prisma.task.delete({
      where: { id }
    });

    res.status(200).json({
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

export const getAdminStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get statistics for admin dashboard
    const [taskCount, participantCount, submissionStats] = await Promise.all([
      prisma.task.count(),
      prisma.participant.count(),
      prisma.submission.groupBy({
        by: ['status'],
        _count: {
          status: true
        }
      })
    ]);

    const totalSubmissions = submissionStats.reduce((acc: number, stat: { _count: { status: number } }) => acc + stat._count.status, 0);
    const pendingSubmissions = submissionStats.find((stat: { status: string }) => stat.status === 'PENDING')?._count.status || 0;

    res.status(200).json({
      totalTasks: taskCount,
      totalParticipants: participantCount,
      totalSubmissions,
      pendingSubmissions
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

export const getPublicTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    // Fetch all tasks for public view (no authentication required)
    const tasks = await prisma.task.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        points: true,
        isVariablePoints: true,
        createdAt: true
      }
    });

    res.status(200).json({
      tasks,
      total: tasks.length
    });
  } catch (error) {
    console.error('Get public tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};
