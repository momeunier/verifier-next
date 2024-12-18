import { closeRedisConnection } from "./redis";

const handleShutdown = async (signal) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // Close Redis connection
    await closeRedisConnection();
    console.log("Successfully closed Redis connection");
  } catch (error) {
    console.error("Error during shutdown:", error);
  }

  // Exit process
  process.exit(0);
};

export const setupShutdownHandler = () => {
  // Only setup handlers if we're in a Node.js environment and process.on is available
  if (
    typeof process === "undefined" ||
    !process ||
    typeof process.on !== "function"
  ) {
    console.log(
      "Shutdown handler not initialized (not in Node.js environment)"
    );
    return;
  }

  // Handle process termination signals
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));

  // Handle uncaught exceptions and unhandled rejections
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    handleShutdown("UNCAUGHT_EXCEPTION");
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    handleShutdown("UNHANDLED_REJECTION");
  });
};
