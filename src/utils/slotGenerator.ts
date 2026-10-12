export interface TimeSlot {
  startTime: string; // "09:00"
  endTime: string;   // "09:30"
  available: boolean;
  availableStaffCount: number;
  totalStaffCount: number;
}

export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export interface SlotGeneratorOptions {
  openTime: string;       // "09:00"
  closeTime: string;      // "21:00"
  breakStart?: string | null; // "13:00"
  breakEnd?: string | null;   // "14:00"
  slotDurationMin: number; // e.g. 30
  staffCount: number;     // Total active staff (e.g. 3)
  walkInBuffer?: number;  // Reserved walk-ins (e.g. 1)
  existingBookings: Array<{
    slotStartTime: string;
    slotEndTime: string;
    staffId?: string | null;
  }>;
  isToday?: boolean;
  currentMinutes?: number; // Minutes from midnight to filter out past slots if today
}

export function generateTimeSlots(options: SlotGeneratorOptions): TimeSlot[] {
  const {
    openTime,
    closeTime,
    breakStart,
    breakEnd,
    slotDurationMin,
    staffCount,
    walkInBuffer = 0,
    existingBookings,
    isToday = false,
    currentMinutes = 0,
  } = options;

  const openMinutes = timeToMinutes(openTime);
  const closeMinutes = timeToMinutes(closeTime);
  const breakStartMinutes = breakStart ? timeToMinutes(breakStart) : null;
  const breakEndMinutes = breakEnd ? timeToMinutes(breakEnd) : null;

  // Effective concurrent capacity per slot
  const effectiveCapacity = Math.max(1, staffCount > 0 ? staffCount - walkInBuffer : 1);

  const slots: TimeSlot[] = [];

  for (let start = openMinutes; start + slotDurationMin <= closeMinutes; start += slotDurationMin) {
    const end = start + slotDurationMin;

    // Check if slot overlaps with break
    if (
      breakStartMinutes !== null &&
      breakEndMinutes !== null &&
      start < breakEndMinutes &&
      end > breakStartMinutes
    ) {
      continue;
    }

    // Check if slot has already passed today
    const isPast = isToday && start <= currentMinutes;

    // Count existing bookings overlapping with this slot
    const overlappingBookingsCount = existingBookings.filter((b) => {
      const bStart = timeToMinutes(b.slotStartTime);
      const bEnd = timeToMinutes(b.slotEndTime);
      return Math.max(start, bStart) < Math.min(end, bEnd);
    }).length;

    const availableStaffCount = Math.max(0, effectiveCapacity - overlappingBookingsCount);
    const available = !isPast && availableStaffCount > 0;

    slots.push({
      startTime: minutesToTime(start),
      endTime: minutesToTime(end),
      available,
      availableStaffCount,
      totalStaffCount: effectiveCapacity,
    });
  }

  return slots;
}
