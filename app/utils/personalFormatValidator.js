import { firstNames } from "./firstNames";
import { logStep } from "./logging";

export const validatePersonalFormat = async (email) => {
  const [localPart] = email.toLowerCase().split("@");
  logStep("debug", "Processing email local part", localPart);

  try {
    const firstNamesSet = new Set(firstNames.map((name) => name.toLowerCase()));
    const parts = localPart.split(/[.-]/);
    const firstName = parts[0].toLowerCase();

    logStep("debug", "Name check", {
      parts,
      firstName,
      setSize: firstNamesSet.size,
    });

    const isFirstName = firstNamesSet.has(firstName);
    const hasLastName = parts.length > 1;

    const factors = {
      isFirstName: isFirstName ? 0.6 : 0,
      hasLastName: hasLastName ? 0.4 : 0,
    };

    const confidence = Object.values(factors).reduce(
      (sum, score) => sum + score,
      0
    );

    const result = {
      isValid: isFirstName,
      confidence,
      factors,
      details: {
        pattern: hasLastName ? "firstname.lastname" : "firstname",
        detectedName: firstName,
        hasLastName,
      },
    };

    logStep("debug", "Validation result", JSON.stringify(result));
    return result;
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
