import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { notificationService } from '../notification/notification.service.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../utils/errors.js';
import { AuthResponse, AuthTokens, UserTokenPayload } from './auth.types.js';
import { RequestOtpInput, UpdateProfileInput, VerifyOtpInput } from './auth.schema.js';
import { UserRole } from '@prisma/client';

export class AuthService {
  async requestOtp(input: RequestOtpInput) {
    const { phone } = input;

    // Generate random 6-digit OTP (or fixed 123456 in dev/mock if preferred)
    const otp = env.isDevelopment ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Invalidate prior unverified OTPs for this phone
    await prisma.otpLog.updateMany({
      where: { phone, verified: false },
      data: { verified: true },
    });

    // Save OTP log
    await prisma.otpLog.create({
      data: {
        phone,
        otp,
        expiresAt,
      },
    });

    // Send via WhatsApp/SMS
    await notificationService.sendOtp(phone, otp);

    return {
      message: 'OTP sent successfully',
      expiresInSeconds: 300,
      devOtp: env.isDevelopment ? otp : undefined,
    };
  }

  async verifyOtp(input: VerifyOtpInput): Promise<AuthResponse> {
    const { phone, otp, role, name } = input;

    // Verify OTP record
    const otpRecord = await prisma.otpLog.findFirst({
      where: {
        phone,
        otp,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      // Increment attempt count on latest record
      await prisma.otpLog.updateMany({
        where: { phone, verified: false },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestError('Invalid or expired OTP');
    }

    // Mark verified
    await prisma.otpLog.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          name: name || null,
          role: role || UserRole.CUSTOMER,
        },
      });
    } else if (role && user.role !== role && user.role === UserRole.CUSTOMER) {
      // Update customer to saloon owner if requested
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role },
      });
    }

    const tokens = await this.generateTokens({
      id: user.id,
      phone: user.phone,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      tokens,
    };
  }

  async generateTokens(payload: UserTokenPayload): Promise<AuthTokens> {
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY as jwt.SignOptions['expiresIn'],
    });

    const refreshToken = jwt.sign(
      { id: payload.id },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRY as jwt.SignOptions['expiresIn'] }
    );

    // Save refresh token in Redis with 30-day expiry
    const redisKey = `refresh_token:${payload.id}:${refreshToken}`;
    await redis.set(redisKey, 'valid', 'EX', 30 * 24 * 60 * 60);

    return { accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { id: string };
      const redisKey = `refresh_token:${decoded.id}:${refreshToken}`;
      const exists = await redis.get(redisKey);

      if (!exists) {
        throw new UnauthorizedError('Refresh token revoked or invalid');
      }

      // Invalidate used refresh token (Token rotation)
      await redis.del(redisKey);

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedError('User account inactive or not found');
      }

      return this.generateTokens({
        id: user.id,
        phone: user.phone,
        role: user.role,
      });
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired refresh token', err);
    }
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await redis.del(`refresh_token:${userId}:${refreshToken}`);
    } else {
      // Invalidate all sessions for user
      const keys = await redis.keys(`refresh_token:${userId}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
    return { success: true, message: 'Logged out successfully' };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedSaloons: {
          select: { id: true, name: true, slug: true, isVerified: true },
        },
      },
    });

    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: input,
    });
    return user;
  }
}

export const authService = new AuthService();
