import { prisma } from '../../config/database.js';
import { saloonService } from '../saloon/saloon.service.js';
import { CreateStaffInput, UpdateStaffInput } from './staff.schema.js';
import { NotFoundError } from '../../utils/errors.js';

export class StaffService {
  async listStaff(saloonId: string) {
    return prisma.staff.findMany({
      where: { saloonId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addStaff(saloonId: string, ownerId: string, input: CreateStaffInput) {
    await saloonService.verifyOwnership(saloonId, ownerId);
    return prisma.staff.create({
      data: {
        saloonId,
        ...input,
      },
    });
  }

  async updateStaff(
    saloonId: string,
    staffId: string,
    ownerId: string,
    input: UpdateStaffInput
  ) {
    await saloonService.verifyOwnership(saloonId, ownerId);
    const staff = await prisma.staff.findFirst({
      where: { id: staffId, saloonId },
    });
    if (!staff) throw new NotFoundError('Staff member not found in this saloon');

    return prisma.staff.update({
      where: { id: staffId },
      data: input,
    });
  }

  async deactivateStaff(saloonId: string, staffId: string, ownerId: string) {
    await saloonService.verifyOwnership(saloonId, ownerId);
    const staff = await prisma.staff.findFirst({
      where: { id: staffId, saloonId },
    });
    if (!staff) throw new NotFoundError('Staff member not found in this saloon');

    return prisma.staff.update({
      where: { id: staffId },
      data: { isActive: false },
    });
  }
}

export const staffService = new StaffService();
