import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import prisma from '../utils/db';

let io: SocketIOServer;

export const initializeSocket = (server: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    socket.join('leaderboard');

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getSocketIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

export const emitCollegeLeaderboardUpdate = async (): Promise<void> => {
    try {
        if (!io) return;

        const collegeStats = await prisma.participant.groupBy({
          by: ['college'],
          _sum: {
            totalPoints: true,
            taskCount: true,
          },
          _count: {
            id: true,
          },
          where: {
            college: {
              not: null,
            },
            totalPoints: {
              gt: 0,
            }
          },
        });

        const rankedColleges = collegeStats
          .map(stat => ({
            college: stat.college,
            totalPoints: stat._sum.totalPoints || 0,
            totalTasks: stat._sum.taskCount || 0,
            participantCount: stat._count.id,
          }))
          .sort((a, b) => b.totalPoints - a.totalPoints)
          .map((college, index) => ({
            ...college,
            rank: index + 1,
          }));

        io.emit('college-leaderboard:update', { leaderboard: rankedColleges });
        console.log('College leaderboard update emitted to all clients');
    } catch (error) {
        console.error('Error emitting college leaderboard update:', error);
    }
};

export const emitLeaderboardUpdate = async (): Promise<void> => {
  try {
    if (!io) return;

    // Get updated leaderboard data
    const leaderboard = await prisma.participant.findMany({
      where: {
        totalPoints: { gt: 0 }
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
      take: 50 // Match the API limit
    });

    // Calculate proper ranks with tie handling
    const leaderboardWithRank = leaderboard.map((participant: any, index: number) => {
      let rank = index + 1;
      
      // Check for ties with previous participants
      if (index > 0) {
        const prevParticipant = leaderboard[index - 1];
        if (participant.totalPoints === prevParticipant.totalPoints && 
            participant.taskCount === prevParticipant.taskCount) {
          // Find the rank of the first participant in this tie group
          let tieStartIndex = index - 1;
          while (tieStartIndex > 0 && 
                 leaderboard[tieStartIndex - 1].totalPoints === participant.totalPoints &&
                 leaderboard[tieStartIndex - 1].taskCount === participant.taskCount) {
            tieStartIndex--;
          }
          rank = tieStartIndex + 1;
        }
      }
      
      return {
        ...participant,
        rank
      };
    });

    // Get total count for pagination
    const total = await prisma.participant.count({
      where: {
        totalPoints: { gt: 0 }
      }
    });

    const responseData = {
      leaderboard: leaderboardWithRank,
      pagination: {
        page: 1,
        limit: 50,
        total,
        totalPages: Math.ceil(total / 50)
      }
    };

    // Emit to all clients in the leaderboard room
    io.to('leaderboard').emit('leaderboard:update', responseData);
    console.log('Leaderboard update emitted to all clients');

    // Also emit college leaderboard update
    await emitCollegeLeaderboardUpdate();

  } catch (error) {
    console.error('Error emitting leaderboard update:', error);
  }
};

export const emitSubmissionUpdate = (submission: any): void => {
  try {
    if (!io) return;
    
    // Emit to admin dashboard (if implemented)
    io.emit('submission:new', submission);
  } catch (error) {
    console.error('Error emitting submission update:', error);
  }
};

export const emitUserStatsUpdate = async (userId: string): Promise<void> => {
  try {
    if (!io) return;

    // Get updated user stats
    const participant = await prisma.participant.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        totalPoints: true,
        taskCount: true,
      }
    });

    if (participant) {
      // Emit to all clients (they'll filter by email)
      io.emit('user:stats:update', participant);
      console.log(`User stats update emitted for user: ${participant.email}`);
    }
  } catch (error) {
    console.error('Error emitting user stats update:', error);
  }
};