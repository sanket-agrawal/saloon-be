import { FastifyReply, FastifyRequest } from 'fastify';
import { adminService } from './admin.service.js';
import { updateSaloonStatusSchema, verifySaloonSchema } from './admin.schema.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export class AdminController {
  async listAllSaloons(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as { page?: string; limit?: string };
    const result = await adminService.listAllSaloons(
      query.page ? Number(query.page) : 1,
      query.limit ? Number(query.limit) : 20
    );
    return sendSuccess(reply, result);
  }

  async verifySaloon(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const validated = verifySaloonSchema.parse(request.body);
    const updated = await adminService.verifySaloon(id, validated);
    return sendSuccess(reply, updated, 'Saloon verification status updated');
  }

  async setSaloonStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const validated = updateSaloonStatusSchema.parse(request.body);
    const updated = await adminService.setSaloonStatus(id, validated);
    return sendSuccess(reply, updated, 'Saloon status updated');
  }

  async getPlatformStats(_request: FastifyRequest, reply: FastifyReply) {
    const stats = await adminService.getPlatformStats();
    return sendSuccess(reply, stats);
  }

  async getRevenueReport(_request: FastifyRequest, reply: FastifyReply) {
    const report = await adminService.getRevenueReport();
    return sendSuccess(reply, report);
  }
}

export const adminController = new AdminController();
