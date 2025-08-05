import { Request, Response } from "express";
import prisma from "../utils/db";
import {
  SubmissionCreateSchema,
  SubmissionUpdateSchema,
  SubmissionsQuerySchema,
} from "../utils/validation";
import {
  sendSubmissionApprovedEmail,
  sendSubmissionRejectedEmail,
} from "../services/emailService";
import {
  emitLeaderboardUpdate,
  emitSubmissionUpdate,
  emitUserStatsUpdate,
} from "../sockets/socketHandlers";
import { AuthRequest, ParticipantAuthRequest } from "../middleware/auth";

export const createSubmission = async (
  req: ParticipantAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { taskType, taskName, fileUrl } = req.body;

    if (!req.participant?.participantId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    // Get participant from database using authenticated ID
    const participant = await prisma.participant.findUnique({
      where: { id: req.participant.participantId },
    });

    if (!participant) {
      res.status(401).json({ error: "Participant not found" });
      return;
    }

    // Check if submission already exists for this task
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        participantId: participant.id,
        taskName,
      },
    });

    if (existingSubmission && existingSubmission.status !== "REJECTED") {
      res
        .status(400)
        .json({
          error:
            "A submission for this task already exists and is not rejected.",
        });
      return;
    }

    if (existingSubmission && existingSubmission.status === "REJECTED") {
      const updatedSubmission = await prisma.submission.update({
        where: { id: existingSubmission.id },
        data: {
          fileUrl,
          status: "PENDING", 
          note: null,
          points: null,
        },
        include: {
          participant: {
            select: { name: true, email: true },
          },
        },
      });
      await prisma.participant.update({
        where: { id: participant.id },
        data: {
          taskCount: {
            increment: 1,
          },
        },
      });
      emitSubmissionUpdate(updatedSubmission);
      res.status(200).json({
        message: "Submission updated successfully",
        submission: updatedSubmission,
      });
      return;
    }
    const submission = await prisma.submission.create({
      data: {
        taskName,
        taskType,
        fileUrl,
        participantId: participant.id,
      },
      include: {
        participant: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    await prisma.participant.update({
      where: { id: participant.id },
      data: {
        taskCount: {
          increment: 1,
        },
      },
    });
    emitSubmissionUpdate(submission);

    res.status(201).json({
      message: "Submission created successfully",
      submission: {
        id: submission.id,
        taskName: submission.taskName,
        taskType: submission.taskType,
        fileUrl: submission.fileUrl,
        status: submission.status,
        createdAt: submission.createdAt,
        participant: submission.participant,
      },
    });
  } catch (error) {
    console.error("Create submission error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      res.status(400).json({ error: "Invalid input data" });
      return;
    }

    res.status(500).json({ error: "Failed to create submission" });
  }
};

export const getSubmissionsByParticipant = async (
  req: ParticipantAuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.participant?.participantId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const participant = await prisma.participant.findUnique({
      where: { id: req.participant.participantId },
      include: {
        submissions: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!participant) {
      res.status(404).json({ error: "Participant not found" });
      return;
    }

    res.status(200).json({
      participant: {
        name: participant.name,
        email: participant.email,
        totalPoints: participant.totalPoints,
        taskCount: participant.taskCount,
      },
      submissions: participant.submissions,
    });
  } catch (error) {
    console.error("Get submissions error:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
};

export const getAdminSubmissions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const queryData = SubmissionsQuerySchema.parse(req.query);
    const page = parseInt(queryData.page);
    const limit = parseInt(queryData.limit);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (queryData.status) {
      where.status = queryData.status;
    }

    if (queryData.taskType) {
      where.taskType = queryData.taskType;
    }

    if (queryData.email) {
      where.participant = {
        email: queryData.email,
      };
    }

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        include: {
          participant: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.submission.count({ where }),
    ]);

    // Get task information for each submission
    interface TaskInfo {
      id: string;
      name: string;
      type: string;
      points: number;
      isVariablePoints: boolean;
    }

    interface SubmissionWithTask {
      id: string;
      taskName: string;
      taskType: string;
      fileUrl: string;
      status: string;
      createdAt: Date;
      updatedAt: Date;
      points: number | null;
      note: string | null;
      participantId: string;
      participant: {
        name: string;
        email: string;
      };
      task: TaskInfo | null;
    }

    const submissionsWithTasks: SubmissionWithTask[] = await Promise.all(
      submissions.map(
        async (
          submission: (typeof submissions)[0]
        ): Promise<SubmissionWithTask> => {
          const task: TaskInfo | null = await prisma.task.findFirst({
            where: {
              name: submission.taskName,
              type: submission.taskType,
            },
            select: {
              id: true,
              name: true,
              type: true,
              points: true,
              isVariablePoints: true,
            },
          });

          return {
            ...submission,
            task: task || null,
          };
        }
      )
    );

    res.status(200).json({
      submissions: submissionsWithTasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get admin submissions error:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
};

export const updateSubmission = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = SubmissionUpdateSchema.parse(req.body);

    // Get submission with participant data
    const existingSubmission = await prisma.submission.findUnique({
      where: { id },
      include: {
        participant: true,
      },
    });

    if (!existingSubmission) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    // Update submission
    const updatedSubmission = await prisma.submission.update({
      where: { id },
      data: updateData,
      include: {
        participant: true,
      },
    });

    // If submission was approved, update participant stats
    if (updateData.status === "APPROVED" && updateData.points) {
      const pointsDifference =
        updateData.points - (existingSubmission.points || 0);

      await prisma.participant.update({
        where: { id: existingSubmission.participantId },
        data: {
          totalPoints: {
            increment: pointsDifference,
          },
          // Task count is already incremented when submission was created
        },
      });

      // Send approval email
      await sendSubmissionApprovedEmail(
        existingSubmission.participant.email,
        existingSubmission.participant.name,
        existingSubmission.taskName,
        updateData.points,
        updateData.note
      );

      // Emit leaderboard update
      await emitLeaderboardUpdate();

      // Emit user stats update
      await emitUserStatsUpdate(existingSubmission.participantId);
    } else if (updateData.status === "REJECTED") {
      // If previously approved, subtract points
      if (
        existingSubmission.status === "APPROVED" &&
        existingSubmission.points
      ) {
        await prisma.participant.update({
          where: { id: existingSubmission.participantId },
          data: {
            totalPoints: {
              decrement: existingSubmission.points,
            },
          },
        });
      }

      // Decrement task count when submission is rejected (since it was incremented on creation)
      await prisma.participant.update({
        where: { id: existingSubmission.participantId },
        data: {
          taskCount: {
            decrement: 1,
          },
        },
      });

      // Emit leaderboard update
      await emitLeaderboardUpdate();

      // Emit user stats update
      await emitUserStatsUpdate(existingSubmission.participantId);

      // Send rejection email
      await sendSubmissionRejectedEmail(
        existingSubmission.participant.email,
        existingSubmission.participant.name,
        existingSubmission.taskName,
        updateData.note
      );
    }

    res.status(200).json({
      message: "Submission updated successfully",
      submission: updatedSubmission,
    });
  } catch (error) {
    console.error("Update submission error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      res.status(400).json({ error: "Invalid input data" });
      return;
    }

    res.status(500).json({ error: "Failed to update submission" });
  }
};
