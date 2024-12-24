import { NextResponse } from "next/server";
import { validateInternationalizedEmail } from "../../../utils/mailExchangerValidator";
import { logStep, logError } from "../../../utils/logging";
import { CHECK_DETAILS } from "../../../constants/checkDetails";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      logStep("warn", "Internationalization check: No email provided");
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    logStep("info", "Internationalization check starting", email);

    const result = await validateInternationalizedEmail(email);
    logStep(
      "info",
      "Internationalization check completed",
      JSON.stringify(result)
    );

    const details = CHECK_DETAILS.internationalized;
    const response = {
      check: "internationalized",
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

    return NextResponse.json(response);
  } catch (error) {
    logError("internationalization", "Check failed", error);
    return NextResponse.json({
      isValid: false,
      confidence: 0,
      factors: {},
      details: { error: error.message },
    });
  }
}
