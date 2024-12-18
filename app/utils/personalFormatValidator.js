import { firstNames } from "./firstNames";

export const validatePersonalFormat = async (email) => {
  const [localPart] = email.toLowerCase().split("@");

  // Remove any dots for consistent checking
  const cleanLocalPart = localPart.replace(/\./g, "");

  try {
    const firstNamesSet = new Set(firstNames.map((name) => name.toLowerCase()));

    // Check for firstname.lastname or firstname pattern
    const parts = cleanLocalPart.split(/[.-]/);
    const firstName = parts[0].toLowerCase();

    const isFirstName = firstNamesSet.has(firstName);
    const hasLastName = parts.length > 1;

    // Calculate confidence based on pattern match
    let confidence = 0;
    const factors = {
      isFirstName: isFirstName ? 0.6 : 0,
      hasLastName: hasLastName ? 0.4 : 0,
    };

    confidence = Object.values(factors).reduce((sum, score) => sum + score, 0);

    return {
      isValid: isFirstName, // Valid if at least the first part is a name
      confidence,
      factors,
      details: {
        pattern: hasLastName ? "firstname.lastname" : "firstname",
        detectedName: firstName,
        hasLastName,
      },
    };
  } catch (error) {
    console.error("Error checking personal format:", error);
    return {
      isValid: false,
      confidence: 0,
      factors: {},
      error: "Could not verify personal format",
    };
  }
};
