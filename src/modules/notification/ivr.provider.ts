import axios from 'axios';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { IVRCallOptions, NotificationResult } from './notification.types.js';

export class IVRProvider {
  async triggerBookingCall(options: IVRCallOptions): Promise<NotificationResult> {
    const { to, bookingNumber, saloonName, slotTime } = options;

    if (env.IVR_PROVIDER === 'mock' || env.isDevelopment) {
      logger.info(
        { to, bookingNumber, saloonName, slotTime },
        '[MOCK IVR] Automated call placed successfully'
      );
      return { success: true, messageId: `mock-ivr-${Date.now()}`, provider: 'mock' };
    }

    try {
      if (env.EXOTEL_API_KEY && env.EXOTEL_SID) {
        // Exotel outbound campaign / voice call API
        const url = `https://api.exotel.com/v1/Accounts/${env.EXOTEL_SID}/Calls/connect.json`;
        const auth = Buffer.from(`${env.EXOTEL_API_KEY}:${env.EXOTEL_API_TOKEN}`).toString(
          'base64'
        );

        const response = await axios.post(
          url,
          new URLSearchParams({
            From: env.EXOTEL_CALLER_ID,
            To: to,
            CallerId: env.EXOTEL_CALLER_ID,
            // Custom parameters or flow app URL
          }),
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );

        return {
          success: true,
          messageId: response.data?.Call?.Sid,
          provider: 'exotel',
        };
      }

      return { success: true, messageId: `ivr-${Date.now()}`, provider: 'mock' };
    } catch (error) {
      logger.error({ err: error, to, bookingNumber }, 'Failed to trigger IVR call');
      return {
        success: false,
        provider: 'exotel',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const ivrProvider = new IVRProvider();
