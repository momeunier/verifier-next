import { NextResponse } from "next/server";
import { validateReputableProvider } from "../../../utils/advancedValidators";
import { logStep, logError } from "../../../utils/logging";
import { CHECK_DETAILS } from "../../../constants/checkDetails";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      logStep("warn", "Reputable provider check: No email provided");
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    logStep("info", "Reputable provider check starting", email);

    const result = await validateReputableProvider(email);
    logStep(
      "info",
      "Reputable provider check completed",
      JSON.stringify(result)
    );

    const details = CHECK_DETAILS.reputableProvider;

    // If not a reputable provider, return a neutral response
    if (result.confidence === null) {
      logStep("info", "Not a reputable provider", email);
      return NextResponse.json({
        check: "reputableProvider",
        email,
        isValid: true,
        confidence: null,
        factors: result.factors,
        message: details.failure,
        details: {
          ...details.details,
          ...result.details,
        },
      });
    }

    const response = {
      check: "reputableProvider",
      email,
      isValid: result.isValid,
      confidence: result.confidence,
      factors: result.factors,
      message: details.success,
      details: {
        ...details.details,
        ...result.details,
      },
    };

    logStep(
      "info",
      "Reputable provider check response prepared",
      JSON.stringify(response)
    );
    return NextResponse.json(response);
  } catch (error) {
    logError("reputableProvider", "Check failed", error);
    return NextResponse.json({
      isValid: false,
      confidence: 0,
      factors: {},
      details: { error: error.message },
    });
  }
}
