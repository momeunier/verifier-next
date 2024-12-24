import { createRedisClient } from "./redis";
import { initializeLists } from "./listManager";
import { logSystem, logError } from "./logging";

export const initializeApp = async () => {
  try {
    logSystem("app", "Starting initialization");

    // Initialize Redis
    const redisClient = await createRedisClient();
    if (redisClient) {
      logSystem("app", "Redis client initialized successfully");
    }

    // Initialize lists
    const { tlds, disposable } = await initializeLists();
    logSystem(
      "app",
      "Lists initialized",
      `TLDs: ${tlds.size}, Disposable: ${disposable.size}`
    );

    return {
      initialized: true,
      redis: !!redisClient,
      lists: {
        tlds: tlds.size,
        disposable: disposable.size,
      },
    };
  } catch (error) {
    logError("app", "Initialization failed", error);
    return {
      initialized: false,
      error: error.message,
    };
  }
};

// Add this to middleware.js or similar to ensure initialization
export const withInitialization =
  (handler) =>
  async (...args) => {
    await initializeApp();
    return handler(...args);
  };
