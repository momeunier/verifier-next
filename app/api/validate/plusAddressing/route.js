import { NextResponse } from "next/server";
import { validatePlusAddressing } from "../../../utils/advancedValidators";
import { logStep, logError } from "../../../utils/logging";
import { CHECK_DETAILS } from "../../../constants/checkDetails";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      logStep("warn", "Plus addressing check: No email provided");
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    logStep("info", "Plus addressing check starting", email);

    const result = await validatePlusAddressing(email);
    logStep("info", "Plus addressing check completed", JSON.stringify(result));

    const details = CHECK_DETAILS.plusAddressing;
    const response = {
      check: "plusAddressing",
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
      "Plus addressing check response prepared",
      JSON.stringify(response)
    );
    return NextResponse.json(response);
  } catch (error) {
    logError("plusAddressing", "Check failed", error);
    return NextResponse.json({
      isValid: false,
      confidence: 0,
      factors: {},
      details: { error: error.message },
    });
  }
}
