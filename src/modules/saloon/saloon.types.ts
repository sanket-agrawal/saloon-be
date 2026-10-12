import { DayOfWeek } from '@prisma/client';

export interface SaloonSearchParams {
  city?: string;
  search?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  page?: number;
  limit?: number;
}

export interface DayScheduleInput {
  dayOfWeek: DayOfWeek;
  openTime: string;
  closeTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  isOpen: boolean;
}
