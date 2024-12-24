import { NextResponse } from "next/server";
import { validateDisposable } from "../../../utils/advancedValidators";
import { logStep, logError } from "../../../utils/logging";
import { CHECK_DETAILS } from "../../../constants/checkDetails";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      logStep("warn", "Disposable check: No email provided");
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    logStep("info", "Disposable check starting", email);

    const result = await validateDisposable(email);
    logStep("info", "Disposable check completed", JSON.stringify(result));

    const details = CHECK_DETAILS.disposable;
    const response = {
      check: "disposable",
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
      "Disposable check response prepared",
      JSON.stringify(response)
    );
    return NextResponse.json(response);
  } catch (error) {
    logError("disposable", "Check failed", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
