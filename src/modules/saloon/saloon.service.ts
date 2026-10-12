import { prisma } from '../../config/database.js';
import { DayOfWeek, Prisma } from '@prisma/client';
import {
  AddGalleryImageInput,
  AddHolidayInput,
  CreateSaloonInput,
  GetAvailableSlotsQuery,
  UpdateSaloonInput,
  UpdateScheduleInput,
} from './saloon.schema.js';
import { SaloonSearchParams } from './saloon.types.js';
import { formatPaginatedResult, getPagination } from '../../utils/pagination.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { generateTimeSlots, timeToMinutes } from '../../utils/slotGenerator.js';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export class SaloonService {
  async listSaloons(params: SaloonSearchParams) {
    const { page, limit, skip } = getPagination(params);

    const where: Prisma.SaloonWhereInput = {
      isActive: true,
    };

    if (params.city) {
      where.city = { equals: params.city, mode: 'insensitive' };
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { address: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const hasCoordinates =
      typeof params.lat === 'number' &&
      !isNaN(params.lat) &&
      typeof params.lng === 'number' &&
      !isNaN(params.lng);

    if (hasCoordinates) {
      const radius = params.radiusKm || 25; // Default 25km radius
      const latDelta = radius / 111;
      const cosLat = Math.cos((params.lat! * Math.PI) / 180);
      const lngDelta = radius / (111 * (cosLat === 0 ? 1 : Math.abs(cosLat)));

      where.latitude = {
        gte: params.lat! - latDelta,
        lte: params.lat! + latDelta,
      };
      where.longitude = {
        gte: params.lng! - lngDelta,
        lte: params.lng! + lngDelta,
      };

      // Fetch candidates within the bounding box
      const candidates = await prisma.saloon.findMany({
        where,
        include: {
          services: {
            where: { isActive: true },
            take: 5,
            select: { id: true, name: true, price: true, durationMin: true },
          },
          _count: {
            select: { reviews: true },
          },
        },
      });

      // Compute exact Haversine distance and sort nearest first
      const withDistance = candidates
        .map((saloon) => {
          let distanceKm: number | null = null;
          if (saloon.latitude !== null && saloon.longitude !== null) {
            distanceKm = calculateDistanceKm(
              params.lat!,
              params.lng!,
              saloon.latitude,
              saloon.longitude
            );
          }
          return {
            ...saloon,
            distanceKm,
          };
        })
        .filter((saloon) => saloon.distanceKm === null || saloon.distanceKm <= radius)
        .sort((a, b) => (a.distanceKm ?? 999999) - (b.distanceKm ?? 999999));

      const total = withDistance.length;
      const paginated = withDistance.slice(skip, skip + limit);

      const enriched = await Promise.all(
        paginated.map(async (saloon) => {
          const ratingAgg = await prisma.review.aggregate({
            where: { saloonId: saloon.id },
            _avg: { rating: true },
          });
          return {
            ...saloon,
            averageRating: ratingAgg._avg.rating ? Number(ratingAgg._avg.rating.toFixed(1)) : 0,
          };
        })
      );

      return formatPaginatedResult(enriched, total, page, limit);
    }

    const [items, total] = await Promise.all([
      prisma.saloon.findMany({
        where,
        skip,
        take: limit,
        include: {
          services: {
            where: { isActive: true },
            take: 5,
            select: { id: true, name: true, price: true, durationMin: true },
          },
          _count: {
            select: { reviews: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.saloon.count({ where }),
    ]);

    // Calculate average rating for each saloon
    const enriched = await Promise.all(
      items.map(async (saloon) => {
        const ratingAgg = await prisma.review.aggregate({
          where: { saloonId: saloon.id },
          _avg: { rating: true },
        });
        return {
          ...saloon,
          distanceKm: null,
          averageRating: ratingAgg._avg.rating ? Number(ratingAgg._avg.rating.toFixed(1)) : 0,
        };
      })
    );

    return formatPaginatedResult(enriched, total, page, limit);
  }

  async getSaloonBySlug(slug: string) {
    const saloon = await prisma.saloon.findUnique({
      where: { slug },
      include: {
        services: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        staff: { where: { isActive: true } },
        schedule: { orderBy: { dayOfWeek: 'asc' } },
        holidays: {
          where: { date: { gte: new Date() } },
          orderBy: { date: 'asc' },
        },
        gallery: { orderBy: { sortOrder: 'asc' } },
        _count: {
          select: { reviews: true, bookings: true },
        },
      },
    });

    if (!saloon) throw new NotFoundError(`Saloon with slug "${slug}" not found`);

    const ratingAgg = await prisma.review.aggregate({
      where: { saloonId: saloon.id },
      _avg: { rating: true },
    });

    return {
      ...saloon,
      averageRating: ratingAgg._avg.rating ? Number(ratingAgg._avg.rating.toFixed(1)) : 0,
    };
  }

  async createSaloon(ownerId: string, input: CreateSaloonInput) {
    let baseSlug = slugify(input.name);
    let slug = baseSlug;
    let counter = 1;

    // Check slug collision
    while (await prisma.saloon.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Create saloon
    const saloon = await prisma.saloon.create({
      data: {
        ...input,
        slug,
        ownerId,
      },
    });

    // Ensure owner has SALOON_OWNER role
    await prisma.user.update({
      where: { id: ownerId },
      data: { role: 'SALOON_OWNER' },
    });

    // Seed default 7-day schedule (09:00 - 21:00)
    const days: DayOfWeek[] = [
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
      'SUNDAY',
    ];

    await prisma.saloonSchedule.createMany({
      data: days.map((dayOfWeek) => ({
        saloonId: saloon.id,
        dayOfWeek,
        openTime: '09:00',
        closeTime: '21:00',
        breakStart: '13:00',
        breakEnd: '14:00',
        isOpen: true,
      })),
    });

    return saloon;
  }

  async getMySaloons(ownerId: string) {
    return prisma.saloon.findMany({
      where: { ownerId },
      include: {
        services: true,
        staff: true,
        schedule: true,
        _count: {
          select: { bookings: true, reviews: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verifyOwnership(saloonId: string, ownerId: string) {
    const saloon = await prisma.saloon.findUnique({ where: { id: saloonId } });
    if (!saloon) throw new NotFoundError('Saloon not found');
    if (saloon.ownerId !== ownerId) throw new ForbiddenError('You do not own this saloon');
    return saloon;
  }

  async updateSaloon(saloonId: string, ownerId: string, input: UpdateSaloonInput) {
    await this.verifyOwnership(saloonId, ownerId);
    return prisma.saloon.update({
      where: { id: saloonId },
      data: input,
    });
  }

  async updateSchedule(saloonId: string, ownerId: string, input: UpdateScheduleInput) {
    await this.verifyOwnership(saloonId, ownerId);

    const ops = input.schedules.map((schedule) =>
      prisma.saloonSchedule.upsert({
        where: {
          saloonId_dayOfWeek: {
            saloonId,
            dayOfWeek: schedule.dayOfWeek,
          },
        },
        update: schedule,
        create: {
          saloonId,
          ...schedule,
        },
      })
    );

    return prisma.$transaction(ops);
  }

  async addHoliday(saloonId: string, ownerId: string, input: AddHolidayInput) {
    await this.verifyOwnership(saloonId, ownerId);
    const dateObj = new Date(input.date);
    return prisma.saloonHoliday.upsert({
      where: {
        saloonId_date: {
          saloonId,
          date: dateObj,
        },
      },
      update: { reason: input.reason },
      create: {
        saloonId,
        date: dateObj,
        reason: input.reason,
      },
    });
  }

  async removeHoliday(saloonId: string, holidayId: string, ownerId: string) {
    await this.verifyOwnership(saloonId, ownerId);
    return prisma.saloonHoliday.delete({
      where: { id: holidayId },
    });
  }

  async addGalleryImage(saloonId: string, ownerId: string, input: AddGalleryImageInput) {
    await this.verifyOwnership(saloonId, ownerId);
    return prisma.saloonGallery.create({
      data: {
        saloonId,
        ...input,
      },
    });
  }

  async removeGalleryImage(saloonId: string, imageId: string, ownerId: string) {
    await this.verifyOwnership(saloonId, ownerId);
    return prisma.saloonGallery.delete({
      where: { id: imageId },
    });
  }

  async getAvailableSlots(slug: string, query: GetAvailableSlotsQuery) {
    const saloon = await prisma.saloon.findUnique({
      where: { slug },
      include: {
        schedule: true,
        holidays: true,
        staff: { where: { isActive: true } },
      },
    });

    if (!saloon) throw new NotFoundError('Saloon not found');

    const targetDate = new Date(query.date);
    targetDate.setHours(0, 0, 0, 0);

    // Check holiday
    const isHoliday = saloon.holidays.some(
      (h) => h.date.toISOString().split('T')[0] === query.date
    );

    if (isHoliday) {
      return {
        date: query.date,
        isClosed: true,
        reason: 'Saloon is closed for holiday',
        slots: [],
      };
    }

    // Determine DayOfWeek
    const dayIndex = targetDate.getDay(); // 0 is Sunday, 1 is Monday ...
    const dayMap: DayOfWeek[] = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ];
    const dayName = dayMap[dayIndex];

    const daySchedule = saloon.schedule.find((s) => s.dayOfWeek === dayName);
    if (!daySchedule || !daySchedule.isOpen) {
      return {
        date: query.date,
        isClosed: true,
        reason: 'Saloon is closed on this day of the week',
        slots: [],
      };
    }

    // Calculate total duration needed for requested services
    let slotDuration = saloon.slotDurationMin;
    if (query.serviceIds && query.serviceIds.length > 0) {
      const services = await prisma.service.findMany({
        where: {
          id: { in: query.serviceIds },
          saloonId: saloon.id,
          isActive: true,
        },
      });
      const totalServiceMinutes = services.reduce((acc, s) => acc + s.durationMin, 0);
      if (totalServiceMinutes > 0) {
        slotDuration = totalServiceMinutes;
      }
    }

    // Existing active bookings for this day
    const existingBookings = await prisma.booking.findMany({
      where: {
        saloonId: saloon.id,
        slotDate: targetDate,
        status: { in: ['CONFIRMED', 'PENDING', 'IN_PROGRESS'] },
      },
      select: {
        slotStartTime: true,
        slotEndTime: true,
        staffId: true,
      },
    });

    // Check if query.date is today
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const isToday = query.date === todayStr;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const staffCount = saloon.staff.length > 0 ? saloon.staff.length : 1;

    const slots = generateTimeSlots({
      openTime: daySchedule.openTime,
      closeTime: daySchedule.closeTime,
      breakStart: daySchedule.breakStart,
      breakEnd: daySchedule.breakEnd,
      slotDurationMin: slotDuration,
      staffCount,
      walkInBuffer: saloon.walkInBuffer,
      existingBookings,
      isToday,
      currentMinutes,
    });

    return {
      date: query.date,
      isClosed: false,
      slotDurationMin: slotDuration,
      slots,
    };
  }

  async getSaloonReviews(slug: string, page = 1, limit = 10) {
    const saloon = await prisma.saloon.findUnique({ where: { slug } });
    if (!saloon) throw new NotFoundError('Saloon not found');

    const pagination = getPagination({ page, limit });
    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where: { saloonId: saloon.id },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.count({ where: { saloonId: saloon.id } }),
    ]);

    return formatPaginatedResult(items, total, pagination.page, pagination.limit);
  }

  async getSaloonGallery(slug: string) {
    const saloon = await prisma.saloon.findUnique({ where: { slug } });
    if (!saloon) throw new NotFoundError('Saloon not found');

    return prisma.saloonGallery.findMany({
      where: { saloonId: saloon.id },
      orderBy: { sortOrder: 'asc' },
    });
  }
}

export const saloonService = new SaloonService();
