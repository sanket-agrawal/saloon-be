import { FastifyReply, FastifyRequest } from 'fastify';
import { serviceModuleService } from './service.service.js';
import { createServiceSchema, updateServiceSchema } from './service.schema.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';
import { UnauthorizedError } from '../../utils/errors.js';

export class ServiceController {
  async listServices(request: FastifyRequest, reply: FastifyReply) {
    const { saloonId } = request.params as { saloonId: string };
    const services = await serviceModuleService.listServices(saloonId);
    return sendSuccess(reply, services);
  }

  async addService(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { saloonId } = request.params as { saloonId: string };
    const validated = createServiceSchema.parse(request.body);
    const service = await serviceModuleService.addService(saloonId, request.user.id, validated);
    return sendCreated(reply, service, 'Service added successfully');
  }

  async updateService(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { saloonId, id } = request.params as { saloonId: string; id: string };
    const validated = updateServiceSchema.parse(request.body);
    const updated = await serviceModuleService.updateService(
      saloonId,
      id,
      request.user.id,
      validated
    );
    return sendSuccess(reply, updated, 'Service updated successfully');
  }

  async deactivateService(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { saloonId, id } = request.params as { saloonId: string; id: string };
    await serviceModuleService.deactivateService(saloonId, id, request.user.id);
    return sendSuccess(reply, null, 'Service deactivated successfully');
  }
}

export const serviceController = new ServiceController();
