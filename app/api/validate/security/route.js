import { NextResponse } from "next/server";
import { validateEmailSecurity } from "../../../utils/advancedValidators";
import { logStep, logError } from "../../../utils/logging";
import { CHECK_DETAILS } from "../../../constants/checkDetails";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      logStep("warn", "Security check: No email provided");
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const [, domain] = email.split("@");
    logStep("info", "Security check starting", domain);

    const result = await validateEmailSecurity(domain);
    logStep("info", "Security check completed", JSON.stringify(result));

    const details = CHECK_DETAILS.security;
    const response = {
      check: "security",
      email,
      isValid: result.isValid,
      confidence: result.confidence,
      factors: result.factors,
      message: result.isValid ? details.success : details.failure,
      details: {
        ...details.details,
        ...result.details,
      },
    };

    logStep(
      "info",
      "Security check response prepared",
      JSON.stringify(response)
    );
    return NextResponse.json(response);
  } catch (error) {
    logError("security", "Check failed", error);
    return NextResponse.json({
      isValid: false,
      confidence: 0,
      factors: {},
      details: { error: error.message },
    });
  }
}
