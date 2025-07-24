import { Request, Response } from "express";
import prisma from "../utils/db";
import { generateOTP, isOTPExpired, generateToken } from "../utils/auth";
import {
  OTPRequestSchema,
  OTPVerifySchema,
  ParticipantOTPRequestSchema,
} from "../utils/validation";
import { sendParticipantOTPEmail } from "../services/emailService";

// Map to store timeout IDs for OTP cleanup
const otpTimeouts = new Map<string, NodeJS.Timeout>();

export const requestParticipantOTP = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, name, college, gender } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if participant already exists
    const existingParticipant = await prisma.participant.findUnique({
      where: { email: normalizedEmail },
    });

    // If new user, name and college are required
    if (!existingParticipant) {
      if (!name || !college) {
        res.status(400).json({
          error: "Name and college are required for new users",
          isNewUser: true,
        });
        return;
      }

      // Validate the input for new users
      const validationResult = ParticipantOTPRequestSchema.safeParse({
        email: normalizedEmail,
        name: name.trim(),
        college: college.trim(),
        gender: gender?.trim(),
      });

      if (!validationResult.success) {
        res.status(400).json({
          error: "Invalid input data",
          details: validationResult.error.issues,
        });
        return;
      }
    }

    // Generate OTP and set expiry (5 minutes as requested)
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    if (existingParticipant) {
      // Update existing participant with new OTP
      await prisma.participant.update({
        where: { email: normalizedEmail },
        data: {
          otp,
          otpExpiry,
        },
      });
    } else {
      // Create new participant with OTP, name, and college
      await prisma.participant.create({
        data: {
          email: normalizedEmail,
          name: name.trim(),
          college: college.trim(),
          gender: gender?.trim(),
          otp,
          otpExpiry,
        },
      });
    }

    // Clear any existing timeout for this email
    const existingTimeout = otpTimeouts.get(normalizedEmail);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set timeout to delete unverified participant after 5 minutes
    const timeoutId = setTimeout(async () => {
      try {
        // Check if OTP was verified (OTP should be null if verified)
        const participant = await prisma.participant.findUnique({
          where: { email: normalizedEmail },
        });

        if (participant && participant.otp !== null) {
          // OTP was not verified, delete the participant
          await prisma.participant.delete({
            where: { email: normalizedEmail },
          });
          console.log(`Deleted unverified participant: ${normalizedEmail}`);
        }

        // Remove timeout from map
        otpTimeouts.delete(normalizedEmail);
      } catch (error) {
        console.error(
          `Error cleaning up participant ${normalizedEmail}:`,
          error
        );
        otpTimeouts.delete(normalizedEmail);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Store timeout ID in map
    otpTimeouts.set(normalizedEmail, timeoutId);

    // Send OTP email
    await sendParticipantOTPEmail(normalizedEmail, otp);

    res.status(200).json({
      message: "OTP sent successfully",
      email: normalizedEmail,
      isNewUser: !existingParticipant,
    });
  } catch (error) {
    console.error("Request participant OTP error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      res.status(400).json({ error: "Invalid input data" });
      return;
    }

    res.status(500).json({ error: "Failed to send OTP" });
  }
};

export const verifyParticipantOTP = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, otp } = OTPVerifySchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();

    // Find participant with matching email and OTP
    const participant = await prisma.participant.findFirst({
      where: {
        email: normalizedEmail,
        otp,
      },
    });

    if (!participant) {
      res.status(401).json({ error: "Invalid email or OTP" });
      return;
    }

    // Check if OTP is expired
    if (isOTPExpired(participant.otpExpiry)) {
      res.status(401).json({ error: "OTP has expired" });
      return;
    }

    // Clear OTP after successful verification
    await prisma.participant.update({
      where: { id: participant.id },
      data: {
        otp: null,
        otpExpiry: null,
      },
    });

    // Clear the timeout since OTP was successfully verified
    const timeoutId = otpTimeouts.get(normalizedEmail);
    if (timeoutId) {
      clearTimeout(timeoutId);
      otpTimeouts.delete(normalizedEmail);
    }

    // Generate JWT token for the participant
    const token = generateToken({
      participantId: participant.id,
      email: participant.email,
    });

    res.status(200).json({
      message: "OTP verified successfully",
      token,
      participant: {
        id: participant.id,
        email: participant.email,
        name: participant.name,
        college: participant.college,
        totalPoints: participant.totalPoints,
        taskCount: participant.taskCount,
      },
    });
  } catch (error) {
    console.error("Verify participant OTP error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      res.status(400).json({ error: "Invalid input data" });
      return;
    }

    res.status(500).json({ error: "Failed to verify OTP" });
  }
};

// Function to clean up timeouts on server shutdown
export const cleanupOTPTimeouts = (): void => {
  otpTimeouts.forEach((timeoutId) => {
    clearTimeout(timeoutId);
  });
  otpTimeouts.clear();
};
