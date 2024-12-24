// SMTP Proxy Configuration
export const SMTP_PROXY = {
  enabled: process.env.SMTP_PROXY_ENABLED === "true",
  url: process.env.SMTP_PROXY_URL,
};

// Environment Configuration
export const ENV = {
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
  isVercel: !!process.env.VERCEL,
};

// Feature Flags
export const FEATURES = {
  useDirectSMTP: !ENV.isVercel && !SMTP_PROXY.enabled,
  useDNSValidation: true,
  useRBLChecks: true,
};
