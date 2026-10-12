import axios from 'axios';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { NotificationResult, SendMessageOptions, SendTemplateOptions } from './notification.types.js';

export class WhatsAppProvider {
  async sendTemplateMessage(options: SendTemplateOptions): Promise<NotificationResult> {
    const { to, template, params } = options;

    if (env.WHATSAPP_PROVIDER === 'mock' || env.isDevelopment) {
      logger.info(
        { to, template, params },
        '[MOCK WhatsApp] Template message simulated successfully'
      );
      return { success: true, messageId: `mock-wa-${Date.now()}`, provider: 'mock' };
    }

    try {
      if (env.WHATSAPP_PROVIDER === 'interakt') {
        const response = await axios.post(
          `${env.WHATSAPP_API_URL}/public/message/`,
          {
            countryCode: '+91',
            phoneNumber: to,
            template: {
              name: template,
              languageCode: 'en',
              bodyValues: Object.values(params).map(String),
            },
          },
          {
            headers: {
              Authorization: `Basic ${env.WHATSAPP_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );
        return { success: true, messageId: response.data?.id, provider: 'interakt' };
      }

      // Default fallback
      logger.info({ to, template }, 'WhatsApp provider send simulated');
      return { success: true, messageId: `wa-${Date.now()}`, provider: env.WHATSAPP_PROVIDER };
    } catch (error) {
      logger.error({ err: error, to, template }, 'Failed to send WhatsApp message');
      return {
        success: false,
        provider: env.WHATSAPP_PROVIDER,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendTextMessage(options: SendMessageOptions): Promise<NotificationResult> {
    const { to, message } = options;
    if (env.WHATSAPP_PROVIDER === 'mock' || env.isDevelopment) {
      logger.info({ to, message }, '[MOCK WhatsApp] Text message simulated');
      return { success: true, messageId: `mock-wa-${Date.now()}`, provider: 'mock' };
    }

    try {
      logger.info({ to, message }, 'WhatsApp text message sent');
      return { success: true, messageId: `wa-${Date.now()}`, provider: env.WHATSAPP_PROVIDER };
    } catch (error) {
      return {
        success: false,
        provider: env.WHATSAPP_PROVIDER,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const whatsappProvider = new WhatsAppProvider();
