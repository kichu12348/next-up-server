import { Router } from 'express';
import { Request, Response } from 'express';
import prisma from '../utils/db';

const router = Router();

// Development route to clear database completely
router.get('/init-db', async (req: Request, res: Response): Promise<void> => {
  try {
    // Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({ error: 'Not allowed in production' });
      return;
    }

    // Delete all records in order (considering foreign key constraints)
    await prisma.submission.deleteMany({});
    await prisma.participant.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.admin.deleteMany({});

    console.log('🗑️  Database cleared successfully');

    // Seed admin accounts
    const adminEmails = [
      "rmahadevan574@gmail.com"
    ];

    for (const email of adminEmails) {
      await prisma.admin.create({
        data: { email }
      });
    }

    console.log('🌱 Admin accounts seeded successfully');

    res.status(200).json({ 
      message: 'Database cleared and admin accounts seeded successfully',
      admins: adminEmails,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing database:', error);
    res.status(500).json({ error: 'Failed to clear database' });
  }
});

// Development route to seed admin accounts
router.get('/seed-admins', async (req: Request, res: Response): Promise<void> => {
  try {
    // Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({ error: 'Not allowed in production' });
      return;
    }

    const adminEmails = [
      "rmahadevan574@gmail.com"
    ];

    const seededAdmins = [];

    for (const email of adminEmails) {
      try {
        const admin = await prisma.admin.upsert({
          where: { email },
          create: { email },
          update: {}, // Don't update if already exists
        });
        seededAdmins.push(admin.email);
      } catch (error) {
        console.error(`Failed to seed admin: ${email}`, error);
      }
    }

    console.log('🌱 Admin accounts seeded successfully');

    res.status(200).json({ 
      message: 'Admin accounts seeded successfully',
      admins: seededAdmins,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error seeding admin accounts:', error);
    res.status(500).json({ error: 'Failed to seed admin accounts' });
  }
});

export default router;
