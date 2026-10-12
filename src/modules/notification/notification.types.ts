export interface SendTemplateOptions {
  to: string; // phone number
  template: string;
  params: Record<string, string | number>;
}

export interface SendMessageOptions {
  to: string;
  message: string;
}

export interface IVRCallOptions {
  to: string;
  bookingNumber: string;
  saloonName: string;
  slotTime: string;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: string;
}
