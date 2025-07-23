"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOTP = exports.requestOTP = void 0;
const db_1 = __importDefault(require("../utils/db"));
const auth_1 = require("../utils/auth");
const validation_1 = require("../utils/validation");
const emailService_1 = require("../services/emailService");
const requestOTP = async (req, res) => {
    try {
        const { email } = validation_1.OTPRequestSchema.parse(req.body);
        // Generate OTP and set expiry (10 minutes)
        const otp = (0, auth_1.generateOTP)();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        // Create or update admin
        await db_1.default.admin.upsert({
            where: { email },
            create: {
                email,
                otp,
                otpExpiry,
            },
            update: {
                otp,
                otpExpiry,
            },
        });
        // Send OTP email
        await (0, emailService_1.sendOTPEmail)(email, otp);
        res.status(200).json({
            message: 'OTP sent successfully',
            email,
        });
    }
    catch (error) {
        console.error('Request OTP error:', error);
        if (error instanceof Error && error.name === 'ZodError') {
            res.status(400).json({ error: 'Invalid input data' });
            return;
        }
        res.status(500).json({ error: 'Failed to send OTP' });
    }
};
exports.requestOTP = requestOTP;
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = validation_1.OTPVerifySchema.parse(req.body);
        // Find admin with matching email and OTP
        const admin = await db_1.default.admin.findFirst({
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
        if ((0, auth_1.isOTPExpired)(admin.otpExpiry)) {
            res.status(401).json({ error: 'OTP has expired' });
            return;
        }
        // Clear OTP after successful verification
        await db_1.default.admin.update({
            where: { id: admin.id },
            data: {
                otp: null,
                otpExpiry: null,
            },
        });
        // Generate JWT token
        const token = (0, auth_1.generateToken)({
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
    }
    catch (error) {
        console.error('Verify OTP error:', error);
        if (error instanceof Error && error.name === 'ZodError') {
            res.status(400).json({ error: 'Invalid input data' });
            return;
        }
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
};
exports.verifyOTP = verifyOTP;
//# sourceMappingURL=authController.js.map