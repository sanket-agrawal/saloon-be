import { prisma } from '../../config/database.js';
import { formatPaginatedResult, getPagination } from '../../utils/pagination.js';
import { UpdateSaloonStatusInput, VerifySaloonInput } from './admin.schema.js';

export class AdminService {
  async listAllSaloons(page = 1, limit = 20) {
    const pagination = getPagination({ page, limit });
    const [items, total] = await Promise.all([
      prisma.saloon.findMany({
        skip: pagination.skip,
        take: pagination.limit,
        include: {
          owner: { select: { id: true, name: true, phone: true, email: true } },
          _count: { select: { bookings: true, reviews: true, staff: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.saloon.count(),
    ]);

    return formatPaginatedResult(items, total, pagination.page, pagination.limit);
  }

  async verifySaloon(saloonId: string, input: VerifySaloonInput) {
    return prisma.saloon.update({
      where: { id: saloonId },
      data: { isVerified: input.isVerified },
    });
  }

  async setSaloonStatus(saloonId: string, input: UpdateSaloonStatusInput) {
    return prisma.saloon.update({
      where: { id: saloonId },
      data: { isActive: input.isActive },
    });
  }

  async getPlatformStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalSaloons,
      verifiedSaloons,
      totalBookings,
      todayBookings,
      totalCompletedBookings,
      totalRevenueAgg,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.saloon.count(),
      prisma.saloon.count({ where: { isVerified: true } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { slotDate: today } }),
      prisma.booking.count({ where: { status: 'COMPLETED' } }),
      prisma.payment.aggregate({
        where: { status: 'CAPTURED' },
        _sum: { amount: true },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
      },
      saloons: {
        total: totalSaloons,
        verified: verifiedSaloons,
      },
      bookings: {
        total: totalBookings,
        today: todayBookings,
        completed: totalCompletedBookings,
      },
      revenue: {
        totalCapturedAmount: totalRevenueAgg._sum.amount || 0,
      },
    };
  }

  async getRevenueReport() {
    const payments = await prisma.payment.findMany({
      where: { status: 'CAPTURED' },
      select: {
        amount: true,
        currency: true,
        createdAt: true,
        booking: {
          select: {
            saloon: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const totalCaptured = payments.reduce((acc, p) => acc + p.amount, 0);

    return {
      totalCaptured,
      recentPayments: payments,
    };
  }
}

export const adminService = new AdminService();
