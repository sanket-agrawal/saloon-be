import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { NotificationResult, SendMessageOptions } from './notification.types.js';

export class SMSProvider {
  async sendSMS(options: SendMessageOptions): Promise<NotificationResult> {
    const { to, message } = options;

    if (env.isDevelopment || env.OTP_PROVIDER === 'mock') {
      logger.info({ to, message }, '[MOCK SMS] SMS sent successfully');
      return { success: true, messageId: `mock-sms-${Date.now()}`, provider: 'mock' };
    }

    logger.info({ to, message }, 'SMS sent');
    return { success: true, messageId: `sms-${Date.now()}`, provider: 'sms' };
  }
}

export const smsProvider = new SMSProvider();
