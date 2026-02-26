import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  database: {
    url: process.env.DATABASE_URL!,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID || '',
  },

  webhookBaseUrl: process.env.WEBHOOK_BASE_URL || 'http://localhost:3001',

  sms: {
    maxDailyPerNumber: parseInt(process.env.MAX_DAILY_MESSAGES_PER_NUMBER || '350', 10),
    maxPerMinute: parseInt(process.env.MAX_MESSAGES_PER_MINUTE || '60', 10),
    rampUpEnabled: process.env.RAMP_UP_ENABLED === 'true',
    rampSchedule: [
      parseInt(process.env.RAMP_DAY_1_LIMIT || '50', 10),
      parseInt(process.env.RAMP_DAY_2_LIMIT || '100', 10),
      parseInt(process.env.RAMP_DAY_3_LIMIT || '150', 10),
      parseInt(process.env.RAMP_DAY_4_LIMIT || '200', 10),
      parseInt(process.env.RAMP_DAY_5_LIMIT || '250', 10),
      parseInt(process.env.RAMP_DAY_6_LIMIT || '300', 10),
      parseInt(process.env.RAMP_DAY_7_LIMIT || '350', 10),
    ],
  },

  compliance: {
    quietHoursStart: parseInt(process.env.COMPLIANCE_QUIET_HOURS_START || '20', 10),
    quietHoursEnd: parseInt(process.env.COMPLIANCE_QUIET_HOURS_END || '9', 10),
    timezone: process.env.COMPLIANCE_TIMEZONE || 'America/New_York',
  },

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@securecreditlines.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
    lastName: process.env.ADMIN_LAST_NAME || 'SCL',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
};
