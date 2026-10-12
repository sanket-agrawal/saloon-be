import { prisma } from '../../config/database.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors.js';
import {
  CancelBookingInput,
  CreateBookingInput,
  ListBookingsQuery,
} from './booking.schema.js';
import { formatPaginatedResult, getPagination } from '../../utils/pagination.js';
import { minutesToTime, timeToMinutes } from '../../utils/slotGenerator.js';
import {
  confirmationQueue,
  ivrQueue,
  reminderQueue,
  reviewQueue,
} from '../../jobs/queue.js';
import { saloonService } from '../saloon/saloon.service.js';
import { BookingStatus, Prisma, UserRole } from '@prisma/client';
import { logger } from '../../config/logger.js';

export class BookingService {
  private generateBookingNumber(): string {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const rand = Math.floor(100 + Math.random() * 900);
    return `BK-${dateStr}-${rand}`;
  }

  async createBooking(userId: string, input: CreateBookingInput) {
    const { saloonId, serviceIds, staffId, slotDate, slotStartTime } = input;

    const saloon = await prisma.saloon.findUnique({
      where: { id: saloonId },
      include: {
        staff: { where: { isActive: true } },
      },
    });

    if (!saloon || !saloon.isActive) {
      throw new NotFoundError('Saloon not found or inactive');
    }

    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        saloonId,
        isActive: true,
      },
    });

    if (services.length !== serviceIds.length) {
      throw new BadRequestError('One or more selected services are invalid or inactive');
    }

    const totalDuration = services.reduce((acc, s) => acc + s.durationMin, 0);
    const totalAmount = services.reduce((acc, s) => acc + s.price, 0);

    const startMinutes = timeToMinutes(slotStartTime);
    const endMinutes = startMinutes + totalDuration;
    const slotEndTime = minutesToTime(endMinutes);

    const parsedDate = new Date(slotDate);
    parsedDate.setHours(0, 0, 0, 0);

    // Check conflict for specific staff if provided
    let assignedStaffId = staffId || null;

    if (assignedStaffId) {
      const conflict = await prisma.booking.findFirst({
        where: {
          saloonId,
          slotDate: parsedDate,
          staffId: assignedStaffId,
          status: { in: ['CONFIRMED', 'PENDING', 'IN_PROGRESS'] },
          AND: [
            { slotStartTime: { lt: slotEndTime } },
            { slotEndTime: { gt: slotStartTime } },
          ],
        },
      });

      if (conflict) {
        throw new ConflictError('Selected barber is already booked for this time slot');
      }
    } else if (saloon.staff.length > 0) {
      // Find an available staff member
      const activeStaffIds = saloon.staff.map((s) => s.id);
      const busyBookings = await prisma.booking.findMany({
        where: {
          saloonId,
          slotDate: parsedDate,
          staffId: { in: activeStaffIds },
          status: { in: ['CONFIRMED', 'PENDING', 'IN_PROGRESS'] },
          AND: [
            { slotStartTime: { lt: slotEndTime } },
            { slotEndTime: { gt: slotStartTime } },
          ],
        },
        select: { staffId: true },
      });

      const busyStaffIds = new Set(busyBookings.map((b) => b.staffId).filter(Boolean));
      const availableStaff = saloon.staff.find((s) => !busyStaffIds.has(s.id));

      if (availableStaff) {
        assignedStaffId = availableStaff.id;
      } else {
        throw new ConflictError('No staff members are available for this time slot');
      }
    }

    // Determine initial booking status
    const status: BookingStatus = saloon.requireAdvance
      ? BookingStatus.PENDING
      : BookingStatus.CONFIRMED;

    const bookingNumber = this.generateBookingNumber();

    // Create booking and line items in a transaction
    const booking = await prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          bookingNumber,
          userId,
          saloonId,
          staffId: assignedStaffId,
          slotDate: parsedDate,
          slotStartTime,
          slotEndTime,
          totalDuration,
          totalAmount,
          status,
        },
        include: {
          saloon: true,
          user: true,
          services: { include: { service: true } },
          staff: true,
        },
      });

      await tx.bookingService.createMany({
        data: services.map((s) => ({
          bookingId: created.id,
          serviceId: s.id,
          price: s.price,
          duration: s.durationMin,
        })),
      });

      return created;
    });

    // If confirmed, trigger background jobs
    if (booking.status === BookingStatus.CONFIRMED) {
      this.enqueueBookingJobs(booking);
    }

    return booking;
  }

  private async enqueueBookingJobs(booking: {
    id: string;
    slotDate: Date;
    slotStartTime: string;
  }) {
    try {
      // 1. WhatsApp confirmation (immediate)
      await confirmationQueue.add('booking-confirmation', { bookingId: booking.id });

      // 2. IVR call (30 seconds later)
      await ivrQueue.add('ivr-call', { bookingId: booking.id }, { delay: 30 * 1000 });

      // 3. Reminder (10 mins before slot)
      const [hours, minutes] = booking.slotStartTime.split(':').map(Number);
      const slotDateTime = new Date(booking.slotDate);
      slotDateTime.setHours(hours, minutes, 0, 0);

      const reminderTime = slotDateTime.getTime() - 10 * 60 * 1000;
      const delay = Math.max(0, reminderTime - Date.now());

      await reminderQueue.add('booking-reminder', { bookingId: booking.id }, { delay });
    } catch (err) {
      logger.error({ err, bookingId: booking.id }, 'Failed to enqueue BullMQ jobs for booking');
    }
  }

  async listMyBookings(userId: string, query: ListBookingsQuery) {
    const { page, limit, skip } = getPagination(query);

    const where: Prisma.BookingWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        include: {
          saloon: { select: { id: true, name: true, slug: true, address: true, phone: true } },
          services: { include: { service: true } },
          staff: { select: { id: true, name: true } },
          review: true,
          payment: true,
        },
        orderBy: { slotDate: 'desc' },
      }),
      prisma.booking.count({ where }),
    ]);

    return formatPaginatedResult(items, total, page, limit);
  }

  async getBookingById(bookingId: string, userId: string, role: UserRole) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        saloon: true,
        user: { select: { id: true, name: true, phone: true, email: true } },
        services: { include: { service: true } },
        staff: true,
        payment: true,
        review: true,
      },
    });

    if (!booking) throw new NotFoundError('Booking not found');

    if (role === UserRole.CUSTOMER && booking.userId !== userId) {
      throw new ForbiddenError('Access denied to this booking');
    }

    if (role === UserRole.SALOON_OWNER && booking.saloon.ownerId !== userId) {
      throw new ForbiddenError('Access denied to this booking');
    }

    return booking;
  }

  async cancelBooking(
    bookingId: string,
    userId: string,
    role: UserRole,
    input: CancelBookingInput
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { saloon: true },
    });

    if (!booking) throw new NotFoundError('Booking not found');

    const isCustomer = booking.userId === userId;
    const isOwner = booking.saloon.ownerId === userId;

    if (!isCustomer && !isOwner && role !== UserRole.ADMIN) {
      throw new ForbiddenError('Not authorized to cancel this booking');
    }

    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      throw new BadRequestError(`Cannot cancel a booking that is ${booking.status}`);
    }

    return prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: isCustomer ? 'customer' : 'owner',
        cancelReason: input.reason || 'Cancelled by user',
      },
    });
  }

  async checkInBooking(bookingId: string, ownerId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { saloon: true },
    });
    if (!booking) throw new NotFoundError('Booking not found');
    await saloonService.verifyOwnership(booking.saloonId, ownerId);

    return prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.IN_PROGRESS,
        checkedInAt: new Date(),
      },
    });
  }

  async completeBooking(bookingId: string, ownerId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { saloon: true },
    });
    if (!booking) throw new NotFoundError('Booking not found');
    await saloonService.verifyOwnership(booking.saloonId, ownerId);

    const completed = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    // Enqueue review request job after 1 hour (3600 seconds)
    try {
      await reviewQueue.add(
        'review-request',
        { bookingId: booking.id },
        { delay: 60 * 60 * 1000 }
      );
    } catch (err) {
      logger.error({ err }, 'Failed to enqueue review request job');
    }

    return completed;
  }

  async markNoShow(bookingId: string, ownerId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { saloon: true },
    });
    if (!booking) throw new NotFoundError('Booking not found');
    await saloonService.verifyOwnership(booking.saloonId, ownerId);

    return prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.NO_SHOW,
      },
    });
  }

  async listSaloonBookings(saloonId: string, ownerId: string, query: ListBookingsQuery) {
    await saloonService.verifyOwnership(saloonId, ownerId);
    const { page, limit, skip } = getPagination(query);

    const where: Prisma.BookingWhereInput = {
      saloonId,
      ...(query.status ? { status: query.status } : {}),
    };

    if (query.date) {
      const d = new Date(query.date);
      d.setHours(0, 0, 0, 0);
      where.slotDate = d;
    } else if (query.startDate && query.endDate) {
      where.slotDate = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    }

    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, phone: true } },
          services: { include: { service: true } },
          staff: true,
          payment: true,
        },
        orderBy: [{ slotDate: 'asc' }, { slotStartTime: 'asc' }],
      }),
      prisma.booking.count({ where }),
    ]);

    return formatPaginatedResult(items, total, page, limit);
  }

  async getTodayBookings(saloonId: string, ownerId: string) {
    await saloonService.verifyOwnership(saloonId, ownerId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return prisma.booking.findMany({
      where: {
        saloonId,
        slotDate: today,
      },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        services: { include: { service: true } },
        staff: true,
        payment: true,
      },
      orderBy: { slotStartTime: 'asc' },
    });
  }

  async getSaloonStats(saloonId: string, ownerId: string) {
    await saloonService.verifyOwnership(saloonId, ownerId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalBookings,
      todayBookings,
      completedToday,
      todayRevenueAgg,
      totalRevenueAgg,
      pendingCount,
    ] = await Promise.all([
      prisma.booking.count({ where: { saloonId } }),
      prisma.booking.count({ where: { saloonId, slotDate: today } }),
      prisma.booking.count({
        where: { saloonId, slotDate: today, status: 'COMPLETED' },
      }),
      prisma.booking.aggregate({
        where: { saloonId, slotDate: today, status: 'COMPLETED' },
        _sum: { totalAmount: true },
      }),
      prisma.booking.aggregate({
        where: { saloonId, status: 'COMPLETED' },
        _sum: { totalAmount: true },
      }),
      prisma.booking.count({
        where: { saloonId, status: 'PENDING' },
      }),
    ]);

    return {
      totalBookings,
      todayBookings,
      completedToday,
      pendingCount,
      todayRevenue: todayRevenueAgg._sum.totalAmount || 0,
      totalRevenue: totalRevenueAgg._sum.totalAmount || 0,
    };
  }
}

export const bookingService = new BookingService();
