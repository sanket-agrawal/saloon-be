import { BookingStatus } from '@prisma/client';

export interface BookingFilters {
  saloonId?: string;
  status?: BookingStatus;
  date?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
