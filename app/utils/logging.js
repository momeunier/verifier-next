// Log levels in order of severity
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Get log level from environment or default to INFO
const LOG_LEVEL = process.env.LOG_LEVEL
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()]
  : LOG_LEVELS.INFO;

// Check if we're in debug mode
const DEBUG_MODE = process.env.DEBUG_MODE === "true";

// Helper to check if we should log at this level
const shouldLog = (level) => {
  const levelValue = LOG_LEVELS[level.toUpperCase()];
  return DEBUG_MODE && levelValue >= LOG_LEVEL;
};

// Standardized logging function for all validators
export const logStep = (step, data, details = "") => {
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0]; // HH:MM:SS
  const logEntry = {
    step,
    data: data?.toString().trim(),
    details: details?.toString().trim(),
    timestamp,
  };

  // Only log if the level is enabled
  if (shouldLog(step)) {
    const dataStr =
      typeof data === "object" ? JSON.stringify(data, null, 2) : data;
    const detailsStr = details
      ? `\nDetails: ${JSON.stringify(details, null, 2)}`
      : "";
    console.log(
      `[${timestamp}] ${step.toUpperCase()}: ${dataStr}${detailsStr}`
    );
  }

  return logEntry;
};

// Error logging with severity levels
export const logError = (component, message, error = null) => {
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  const errorDetails = error ? `: ${error.message || error}` : "";

  // Always log errors in production, but with DEBUG_MODE we get more details
  if (shouldLog("ERROR")) {
    console.error(
      `[${timestamp}] ERROR [${component}] ${message}${errorDetails}`,
      error ? { error } : ""
    );
  }

  return {
    timestamp,
    component,
    message,
    error: error?.message || error,
  };
};

// System logging for initialization, shutdown, etc.
export const logSystem = (component, message, details = "") => {
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  const detailsStr = details ? ` (${details})` : "";

  // Only log system messages in debug mode or if they're critical
  if (shouldLog("INFO")) {
    console.log(`[${timestamp}] SYSTEM [${component}] ${message}${detailsStr}`);
  }

  return {
    timestamp,
    component,
    message,
    details,
  };
};
