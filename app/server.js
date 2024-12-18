import { setupShutdownHandler } from "./utils/shutdownHandler";

// Only run in Node.js environment
if (typeof window === "undefined") {
  // Setup shutdown handler for the Node.js process
  setupShutdownHandler();
}
