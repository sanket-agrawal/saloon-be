import { FastifyReply, FastifyRequest } from 'fastify';
import { staffService } from './staff.service.js';
import { createStaffSchema, updateStaffSchema } from './staff.schema.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';
import { UnauthorizedError } from '../../utils/errors.js';

export class StaffController {
  async listStaff(request: FastifyRequest, reply: FastifyReply) {
    const { saloonId } = request.params as { saloonId: string };
    const staff = await staffService.listStaff(saloonId);
    return sendSuccess(reply, staff);
  }

  async addStaff(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { saloonId } = request.params as { saloonId: string };
    const validated = createStaffSchema.parse(request.body);
    const staff = await staffService.addStaff(saloonId, request.user.id, validated);
    return sendCreated(reply, staff, 'Staff member added successfully');
  }

  async updateStaff(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { saloonId, id } = request.params as { saloonId: string; id: string };
    const validated = updateStaffSchema.parse(request.body);
    const updated = await staffService.updateStaff(
      saloonId,
      id,
      request.user.id,
      validated
    );
    return sendSuccess(reply, updated, 'Staff member updated successfully');
  }

  async deactivateStaff(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { saloonId, id } = request.params as { saloonId: string; id: string };
    await staffService.deactivateStaff(saloonId, id, request.user.id);
    return sendSuccess(reply, null, 'Staff member deactivated successfully');
  }
}

export const staffController = new StaffController();
