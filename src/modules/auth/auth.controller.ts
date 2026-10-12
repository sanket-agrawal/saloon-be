import { FastifyReply, FastifyRequest } from 'fastify';
import { authService } from './auth.service.js';
import {
  refreshTokenSchema,
  requestOtpSchema,
  updateProfileSchema,
  verifyOtpSchema,
} from './auth.schema.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { UnauthorizedError } from '../../utils/errors.js';

export class AuthController {
  async requestOtp(request: FastifyRequest, reply: FastifyReply) {
    const validated = requestOtpSchema.parse(request.body);
    const result = await authService.requestOtp(validated);
    return sendSuccess(reply, result, 'OTP sent successfully');
  }

  async verifyOtp(request: FastifyRequest, reply: FastifyReply) {
    const validated = verifyOtpSchema.parse(request.body);
    const result = await authService.verifyOtp(validated);
    return sendSuccess(reply, result, 'OTP verified successfully');
  }

  async refresh(request: FastifyRequest, reply: FastifyReply) {
    const validated = refreshTokenSchema.parse(request.body);
    const tokens = await authService.refreshToken(validated.refreshToken);
    return sendSuccess(reply, tokens, 'Token refreshed successfully');
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const body = request.body as { refreshToken?: string } | undefined;
    const result = await authService.logout(request.user.id, body?.refreshToken);
    return sendSuccess(reply, result, 'Logged out successfully');
  }

  async getMe(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const user = await authService.getMe(request.user.id);
    return sendSuccess(reply, user);
  }

  async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const validated = updateProfileSchema.parse(request.body);
    const updated = await authService.updateProfile(request.user.id, validated);
    return sendSuccess(reply, updated, 'Profile updated successfully');
  }
}

export const authController = new AuthController();
