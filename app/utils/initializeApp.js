import { initializeLists } from "./listManager";

let initialized = false;

export const initializeApp = async () => {
  if (initialized) return;

  try {
    console.log("Initializing application...");

    // Initialize lists
    const { tlds, disposableDomains } = await initializeLists();
    console.log(
      `Initialization complete. TLDs: ${tlds}, Disposable Domains: ${disposableDomains}`
    );

    initialized = true;
    return true;
  } catch (error) {
    console.error("Error during initialization:", error);
    return false;
  }
};

// Add this to middleware.js or similar to ensure initialization
export const withInitialization =
  (handler) =>
  async (...args) => {
    await initializeApp();
    return handler(...args);
  };
