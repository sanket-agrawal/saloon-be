import dotenv from 'dotenv';
import { cleanEnv, str, port, url } from 'envalid';

dotenv.config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ['development', 'test', 'production'],
    default: 'development',
  }),
  PORT: port({ default: 3000 }),
  API_URL: str({ default: 'http://localhost:3000' }),
  FRONTEND_URL: str({ default: 'http://localhost:5173' }),

  DATABASE_URL: str({
    desc: 'PostgreSQL connection URL',
    default: 'postgresql://saloon:saloon_password@localhost:5432/saloon_db',
  }),

  REDIS_URL: str({
    desc: 'Redis connection URL',
    default: 'redis://localhost:6379',
  }),
  USE_MOCK_REDIS: str({ default: 'true' }),

  BULL_BOARD_PORT: port({ default: 3001 }),

  JWT_SECRET: str({ default: 'super_secret_jwt_key_that_is_at_least_32_characters_long' }),
  JWT_REFRESH_SECRET: str({
    default: 'super_secret_refresh_key_that_is_at_least_32_characters_long',
  }),
  JWT_ACCESS_EXPIRY: str({ default: '15m' }),
  JWT_REFRESH_EXPIRY: str({ default: '30d' }),

  WHATSAPP_PROVIDER: str({ default: 'mock' }),
  WHATSAPP_API_KEY: str({ default: 'mock_key' }),
  WHATSAPP_API_URL: str({ default: 'https://api.interakt.ai/v1' }),

  OTP_PROVIDER: str({ default: 'mock' }),
  OTPLESS_CLIENT_ID: str({ default: 'mock_client_id' }),
  OTPLESS_CLIENT_SECRET: str({ default: 'mock_client_secret' }),

  RAZORPAY_KEY_ID: str({ default: 'rzp_test_mockkeyid123' }),
  RAZORPAY_KEY_SECRET: str({ default: 'mocksecret123' }),
  RAZORPAY_WEBHOOK_SECRET: str({ default: 'mockwebhooksecret123' }),

  IVR_PROVIDER: str({ default: 'mock' }),
  EXOTEL_API_KEY: str({ default: 'mock_exotel_key' }),
  EXOTEL_API_TOKEN: str({ default: 'mock_exotel_token' }),
  EXOTEL_SID: str({ default: 'mock_sid' }),
  EXOTEL_CALLER_ID: str({ default: 'mock_caller_id' }),

  S3_BUCKET: str({ default: 'saloon-uploads' }),
  S3_REGION: str({ default: 'ap-south-1' }),
  S3_ACCESS_KEY: str({ default: 'mock_access_key' }),
  S3_SECRET_KEY: str({ default: 'mock_secret_key' }),
  S3_ENDPOINT: str({ default: 'https://s3.ap-south-1.amazonaws.com' }),
});
