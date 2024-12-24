import { NextResponse } from "next/server";
import {
  validateMailExchangers,
  getMXRecords,
} from "../../../utils/mailExchangerValidator";
import { logStep, logError } from "../../../utils/logging";
import { CHECK_DETAILS } from "../../../constants/checkDetails";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      logStep("warn", "Mail exchangers check: No email provided");
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!email.includes("@")) {
      logStep("warn", "Mail exchangers check: Invalid email format", email);
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const [, domain] = email.split("@");
    logStep("info", "Mail exchangers check starting", domain);

    // First get MX records without testing connectivity
    const mxResult = await getMXRecords(domain);

    // Then do the full validation if requested
    const fullCheck = request.headers.get("x-full-check") === "true";
    let validationResult = null;

    if (fullCheck) {
      validationResult = await validateMailExchangers(domain);
      logStep(
        "info",
        "Full mail exchanger check completed",
        JSON.stringify(validationResult)
      );
    }

    const details = CHECK_DETAILS.mailExchangers;
    const response = {
      check: "mailExchangers",
      domain,
      isValid: mxResult.isValid,
      details: {
        ...details.details,
        ...mxResult.details,
      },
    };

    // Add full validation results if available
    if (validationResult) {
      response.fullValidation = {
        isValid: validationResult.isValid,
        confidence: validationResult.confidence,
        factors: validationResult.factors,
        details: validationResult.details,
      };
      response.message = validationResult.isValid
        ? details.success
        : details.failure;
    }

    return NextResponse.json(response);
  } catch (error) {
    logError("mailExchangers", "Check failed", error);
    return NextResponse.json({
      isValid: false,
      confidence: 0,
      factors: {},
      details: { error: error.message },
    });
  }
}
