const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function isTruthy(value, defaultValue = false) {
  if (value === undefined) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function getEnvConfig() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const rawUri = process.env.MONGODB_URI || '';
  const smsProvider = (process.env.SMS_PROVIDER || 'console').trim().toLowerCase();

  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isStaging: nodeEnv === 'staging',
    isDevelopment: nodeEnv === 'development',
    mongodb: {
      uri: rawUri,
      dbName: process.env.MONGODB_DB_NAME || 'gigshield_dev',
      enableAtlasTls: rawUri.startsWith('mongodb+srv://') || isTruthy(process.env.MONGODB_TLS, true),
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 20),
    },
    seed: {
      enabled: isTruthy(process.env.ENABLE_SEED, nodeEnv !== 'production'),
      allowProductionSeed: isTruthy(process.env.ALLOW_PRODUCTION_SEED, false),
    },
    sms: {
      provider: smsProvider,
      allowSimulatedSms: isTruthy(process.env.ALLOW_SIMULATED_SMS, nodeEnv !== 'production'),
      fromNumber: process.env.TWILIO_FROM_NUMBER || '',
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
      },
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      mapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
      weatherApiKey: process.env.GOOGLE_WEATHER_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
    },
    openWeather: {
      apiKey: process.env.OPENWEATHERMAP_API_KEY || '',
      baseUrl: process.env.OPENWEATHERMAP_BASE_URL || 'https://api.openweathermap.org',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      fallbackModels: (process.env.GEMINI_FALLBACK_MODELS || 'gemini-2.5-flash-lite,gemini-2.5-pro')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
      maxRetries: Number(process.env.GEMINI_MAX_RETRIES || 2),
      retryDelayMs: Number(process.env.GEMINI_RETRY_DELAY_MS || 1200),
    },
  };
}

module.exports = {
  getEnvConfig,
  isTruthy,
};
