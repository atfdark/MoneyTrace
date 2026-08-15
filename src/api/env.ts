// Environment Configuration
export const env = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  WS_BASE_URL: import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/ws',
  APP_NAME: 'MoneyTrace',
  APP_VERSION: '1.0.0',
  TOKEN_KEY: 'moneytrace_access_token',
  REFRESH_TOKEN_KEY: 'moneytrace_refresh_token',
  USER_KEY: 'moneytrace_user',
} as const;

export type EnvConfig = typeof env;