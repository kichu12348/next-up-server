import { Request, Response } from 'express';
import prisma from '../utils/db';
import { generateToken, generateOTP, isOTPExpired } from '../utils/auth';
import { OTPRequestSchema, OTPVerifySchema } from '../utils/validation';
import { sendOTPEmail } from '../services/emailService';

export const checkAdminEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Check if admin exists in database
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    res.status(200).json({
      isAdmin: !!existingAdmin
    });
  } catch (error) {
    console.error('Check admin email error:', error);
    res.status(500).json({ error: 'Failed to check admin email' });
  }
};

export const requestOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = OTPRequestSchema.parse(req.body);

    // Check if admin exists in database
    const existingAdmin = await prisma.admin.findUnique({
      where: { email }
    });

    if (!existingAdmin) {
      res.status(401).json({ error: 'Unauthorized: Admin account not found' });
      return;
    }

    // Generate OTP and set expiry (10 minutes)
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update existing admin with OTP
    await prisma.admin.update({
      where: { email },
      data: {
        otp,
        otpExpiry,
      },
    });

    // Send OTP email
    await sendOTPEmail(email, otp);

    res.status(200).json({
      message: 'OTP sent successfully',
      email,
    });
  } catch (error) {
    console.error('Request OTP error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid input data' });
      return;
    }

    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = OTPVerifySchema.parse(req.body);

    // Find admin with matching email and OTP
    const admin = await prisma.admin.findFirst({
      where: {
        email,
        otp,
      },
    });

    if (!admin) {
      res.status(401).json({ error: 'Invalid email or OTP' });
      return;
    }

    // Check if OTP is expired
    if (isOTPExpired(admin.otpExpiry)) {
      res.status(401).json({ error: 'OTP has expired' });
      return;
    }

    // Clear OTP after successful verification
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        otp: null,
        otpExpiry: null,
      },
    });

    // Generate JWT token
    const token = generateToken({
      adminId: admin.id,
      email: admin.email,
    });

    res.status(200).json({
      message: 'Login successful',
      token,
      admin: {
        id: admin.id,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid input data' });
      return;
    }

    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

export const validateAdminToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as { adminId: string };
      
      // Check if admin still exists in database
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.adminId },
        select: { id: true, email: true }
      });

      if (!admin) {
        res.status(401).json({ error: 'Admin not found' });
        return;
      }

      res.status(200).json({
        valid: true,
        admin: {
          id: admin.id,
          email: admin.email
        }
      });
    } catch (jwtError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
  } catch (error) {
    console.error('Validate admin token error:', error);
    res.status(500).json({ error: 'Failed to validate token' });
  }
};

export const validateParticipantToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as { participantId: string };
      
      // Check if participant still exists in database
      const participant = await prisma.participant.findUnique({
        where: { id: decoded.participantId },
        select: { id: true, email: true, name: true, college: true, totalPoints: true, taskCount: true }
      });

      if (!participant) {
        res.status(401).json({ error: 'Participant not found' });
        return;
      }

      res.status(200).json({
        valid: true,
        participant: {
          id: participant.id,
          email: participant.email,
          name: participant.name,
          college: participant.college,
          totalPoints: participant.totalPoints,
          taskCount: participant.taskCount
        }
      });
    } catch (jwtError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
  } catch (error) {
    console.error('Validate participant token error:', error);
    res.status(500).json({ error: 'Failed to validate token' });
  }
};
