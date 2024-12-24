import { NextResponse } from "next/server";
import { validatePersonalFormat } from "../../../utils/personalFormatValidator";
import { logStep, logError } from "../../../utils/logging";
import { firstNames } from "../../../utils/firstNames";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      logStep("warn", "Personal format check: No email provided");
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    logStep("info", "Personal format check starting", email);

    // Debug logging
    const [localPart] = email.toLowerCase().split("@");
    const cleanLocalPart = localPart.replace(/\./g, "");
    const firstName = cleanLocalPart.split(/[.-]/)[0];
    const firstNamesSet = new Set(firstNames.map((name) => name.toLowerCase()));

    logStep("debug", "Validation details", {
      localPart,
      cleanLocalPart,
      firstName,
      setSize: firstNamesSet.size,
      nameInSet: firstNamesSet.has(firstName),
      firstFewNames: Array.from(firstNamesSet).slice(0, 5),
    });

    const result = await validatePersonalFormat(email);
    logStep("info", "Personal format check completed", JSON.stringify(result));

    return NextResponse.json({
      check: "personalFormat",
      email,
      ...result,
      message: result.isValid
        ? "Email appears to be in a personal format"
        : "Email does not appear to be in a personal format",
      details: {
        ...result.details,
        what: "Checks if the email follows a personal name format",
        why: "Personal email addresses often follow firstname or firstname.lastname patterns",
        standards: [
          "Common name patterns",
          "First name databases",
          "Name format analysis",
        ],
        recommendations: [
          "Use your real name for personal email addresses",
          "Consider firstname.lastname format for professional use",
          "Avoid random strings or numbers for personal communication",
        ],
      },
    });
  } catch (error) {
    logError("personalFormat", "Check failed", error);
    return NextResponse.json({
      isValid: false,
      confidence: 0,
      factors: {},
      details: { error: error.message },
    });
  }
}
