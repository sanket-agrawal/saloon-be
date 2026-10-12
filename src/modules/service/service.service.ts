import { prisma } from '../../config/database.js';
import { saloonService } from '../saloon/saloon.service.js';
import { CreateServiceInput, UpdateServiceInput } from './service.schema.js';
import { NotFoundError } from '../../utils/errors.js';

export class ServiceModuleService {
  async listServices(saloonId: string) {
    return prisma.service.findMany({
      where: { saloonId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async addService(saloonId: string, ownerId: string, input: CreateServiceInput) {
    await saloonService.verifyOwnership(saloonId, ownerId);
    return prisma.service.create({
      data: {
        saloonId,
        ...input,
      },
    });
  }

  async updateService(
    saloonId: string,
    serviceId: string,
    ownerId: string,
    input: UpdateServiceInput
  ) {
    await saloonService.verifyOwnership(saloonId, ownerId);
    const service = await prisma.service.findFirst({
      where: { id: serviceId, saloonId },
    });
    if (!service) throw new NotFoundError('Service not found in this saloon');

    return prisma.service.update({
      where: { id: serviceId },
      data: input,
    });
  }

  async deactivateService(saloonId: string, serviceId: string, ownerId: string) {
    await saloonService.verifyOwnership(saloonId, ownerId);
    const service = await prisma.service.findFirst({
      where: { id: serviceId, saloonId },
    });
    if (!service) throw new NotFoundError('Service not found in this saloon');

    return prisma.service.update({
      where: { id: serviceId },
      data: { isActive: false },
    });
  }
}

export const serviceModuleService = new ServiceModuleService();
