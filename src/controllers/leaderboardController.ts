import { Request, Response } from 'express';
import prisma from '../utils/db';
import { LeaderboardQuerySchema } from '../utils/validation';
import { AuthRequest } from '../middleware/auth';

export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const queryData = LeaderboardQuerySchema.parse(req.query);
    const page = parseInt(queryData.page);
    const limit = parseInt(queryData.limit);
    const skip = (page - 1) * limit;

    const [participants, total] = await Promise.all([
      prisma.participant.findMany({
        where: {
          totalPoints: { gt: 0 },
        },
        select: {
          id: true,
          name: true,
          totalPoints: true,
          taskCount: true,
        },
        orderBy: [
          { totalPoints: 'desc' },
          { taskCount: 'desc' },
          { name: 'asc' }
        ],
        skip,
        take: limit,
      }),
      prisma.participant.count({
        where: {
          totalPoints: { gt: 0 },
        },
      }),
    ]);

    // Add rank to each participant with proper tie handling
    const leaderboard = participants.map((participant: any, index: number) => {
      let rank = skip + index + 1;
      
      // Check for ties with previous participants
      if (index > 0) {
        const prevParticipant = participants[index - 1];
        if (participant.totalPoints === prevParticipant.totalPoints && 
            participant.taskCount === prevParticipant.taskCount) {
          // Find the rank of the first participant in this tie group
          let tieStartIndex = index - 1;
          while (tieStartIndex > 0 && 
                 participants[tieStartIndex - 1].totalPoints === participant.totalPoints &&
                 participants[tieStartIndex - 1].taskCount === participant.taskCount) {
            tieStartIndex--;
          }
          rank = skip + tieStartIndex + 1;
        }
      }
      
      return {
        ...participant,
        rank
      };
    });

    res.status(200).json({
      leaderboard,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};

export const exportLeaderboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const participants = await prisma.participant.findMany({
      where: {
        totalPoints: { gt: 0 },
      },
      select: {
        name: true,
        email: true,
        totalPoints: true,
        taskCount: true,
        createdAt: true,
      },
      orderBy: [
        { totalPoints: 'desc' },
        { taskCount: 'desc' },
        { name: 'asc' }
      ],
    });

    // Generate CSV content with proper tie handling
    const csvHeader = 'Rank,Name,Email,Total Points,Task Count,Join Date\n';
    const csvContent = participants
      .map((participant: any, index: number) => {
        let rank = index + 1;
        
        // Check for ties with previous participants
        if (index > 0) {
          const prevParticipant = participants[index - 1];
          if (participant.totalPoints === prevParticipant.totalPoints && 
              participant.taskCount === prevParticipant.taskCount) {
            // Find the rank of the first participant in this tie group
            let tieStartIndex = index - 1;
            while (tieStartIndex > 0 && 
                   participants[tieStartIndex - 1].totalPoints === participant.totalPoints &&
                   participants[tieStartIndex - 1].taskCount === participant.taskCount) {
              tieStartIndex--;
            }
            rank = tieStartIndex + 1;
          }
        }
        
        const joinDate = participant.createdAt.toISOString().split('T')[0];
        return `${rank},"${participant.name}","${participant.email}",${participant.totalPoints},${participant.taskCount},${joinDate}`;
      })
      .join('\n');

    const csv = csvHeader + csvContent;

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leaderboard.csv"');
    
    res.status(200).send(csv);
  } catch (error) {
    console.error('Export leaderboard error:', error);
    res.status(500).json({ error: 'Failed to export leaderboard' });
  }
};
