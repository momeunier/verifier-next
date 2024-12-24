import { NextResponse } from "next/server";
import { validateDomainAge } from "../../../utils/advancedValidators";
import { logStep, logError } from "../../../utils/logging";
import { CHECK_DETAILS } from "../../../constants/checkDetails";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      logStep("warn", "Domain age check: No email provided");
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const [, domain] = email.split("@");
    logStep("info", "Domain age check starting", domain);

    const result = await validateDomainAge(domain);
    logStep("info", "Domain age check completed", JSON.stringify(result));

    const details = CHECK_DETAILS.domainAge;
    const response = {
      check: "domainAge",
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
      "Domain age check response prepared",
      JSON.stringify(response)
    );
    return NextResponse.json(response);
  } catch (error) {
    logError("domainAge", "Check failed", error);
    return NextResponse.json({
      isValid: false,
      confidence: 0,
      factors: {},
      details: { error: error.message },
    });
  }
}
