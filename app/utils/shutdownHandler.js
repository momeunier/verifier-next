import { closeRedisConnection } from "./redis";
import { logSystem, logError } from "./logging";

const handleShutdown = async (signal) => {
  logSystem("shutdown", `Received ${signal}. Starting graceful shutdown...`);

  try {
    await closeRedisConnection();
    logSystem("shutdown", "Successfully closed Redis connection");
  } catch (error) {
    logError("shutdown", "Error during shutdown", error);
  }

  // Give time for cleanup before exiting
  setTimeout(() => {
    logSystem(
      "shutdown",
      "Cleanup complete",
      "Exiting process with status code 0"
    );
    process.exit(0);
  }, 1000);
};

export const setupShutdownHandler = () => {
  // Handle graceful shutdown signals
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));

  // Handle uncaught exceptions and unhandled rejections
  process.on("uncaughtException", (error) => {
    logError("uncaughtException", "Uncaught Exception", error);
    handleShutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason, promise) => {
    logError("unhandledRejection", "Unhandled Rejection", {
      reason,
      promise,
    });
    handleShutdown("unhandledRejection");
  });
};
