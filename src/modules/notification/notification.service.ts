import { whatsappProvider } from './whatsapp.provider.js';
import { ivrProvider } from './ivr.provider.js';
import { smsProvider } from './sms.provider.js';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';

export class NotificationService {
  async sendOtp(phone: string, otp: string) {
    const message = `Your Saloon booking verification code is ${otp}. Valid for 5 minutes. Do not share this with anyone.`;
    // Try WhatsApp first
    const waResult = await whatsappProvider.sendTextMessage({ to: phone, message });
    if (!waResult.success) {
      // Fallback to SMS
      await smsProvider.sendSMS({ to: phone, message });
    }
    return { success: true };
  }

  async sendBookingConfirmation(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        saloon: true,
        user: true,
        services: { include: { service: true } },
      },
    });

    if (!booking) return;

    const serviceNames = booking.services.map((s) => s.service.name).join(', ');
    const slotTime = `${booking.slotDate.toISOString().split('T')[0]} at ${booking.slotStartTime}`;

    // Send WhatsApp confirmation
    await whatsappProvider.sendTemplateMessage({
      to: booking.user.phone,
      template: 'booking_confirmation',
      params: {
        bookingNumber: booking.bookingNumber,
        saloonName: booking.saloon.name,
        services: serviceNames,
        slotTime,
        totalAmount: booking.totalAmount,
      },
    });

    await prisma.booking.update({
      where: { id: bookingId },
      data: { confirmationSent: true },
    });

    logger.info({ bookingId }, 'Booking confirmation sent');
  }

  async sendBookingReminder(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { saloon: true, user: true },
    });

    if (!booking || booking.status === 'CANCELLED' || booking.reminderSent) {
      return;
    }

    await whatsappProvider.sendTemplateMessage({
      to: booking.user.phone,
      template: 'booking_reminder',
      params: {
        saloonName: booking.saloon.name,
        slotTime: `${booking.slotStartTime}`,
      },
    });

    await prisma.booking.update({
      where: { id: bookingId },
      data: { reminderSent: true },
    });

    logger.info({ bookingId }, 'Booking reminder sent');
  }

  async triggerIvrCall(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { saloon: true, user: true },
    });

    if (!booking || booking.status === 'CANCELLED' || booking.ivrSent) {
      return;
    }

    await ivrProvider.triggerBookingCall({
      to: booking.user.phone,
      bookingNumber: booking.bookingNumber,
      saloonName: booking.saloon.name,
      slotTime: booking.slotStartTime,
    });

    await prisma.booking.update({
      where: { id: bookingId },
      data: { ivrSent: true },
    });

    logger.info({ bookingId }, 'IVR call initiated');
  }

  async sendReviewRequest(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { saloon: true, user: true },
    });

    if (!booking || booking.reviewRequested || booking.status !== 'COMPLETED') {
      return;
    }

    const reviewUrl = `${process.env.FRONTEND_URL || 'https://saloon.app'}/review/${booking.id}`;

    await whatsappProvider.sendTemplateMessage({
      to: booking.user.phone,
      template: 'review_request',
      params: {
        saloonName: booking.saloon.name,
        reviewUrl,
      },
    });

    await prisma.booking.update({
      where: { id: bookingId },
      data: { reviewRequested: true },
    });

    logger.info({ bookingId }, 'Review request notification sent');
  }
}

export const notificationService = new NotificationService();
