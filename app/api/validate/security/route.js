import { NextResponse } from "next/server";
import { validateEmailSecurity } from "../../../utils/advancedValidators";
import { CHECK_DETAILS } from "../../../constants/checkDetails";

// Force Node.js runtime
export const runtime = "nodejs";
// Increase timeout to 30 seconds
export const maxDuration = 30;

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const domain = email.split("@")[1];
    if (!domain) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    console.log("Starting security check for domain:", domain);
    const result = await validateEmailSecurity(domain);
    const details = CHECK_DETAILS.security;

    // Log the validation results
    console.log("Security check results:", {
      domain,
      isValid: result.isValid,
      confidence: result.confidence,
      factors: result.factors,
    });

    const response = {
      check: "security",
      email,
      isValid: result.isValid,
      confidence: result.confidence,
      factors: result.factors,
      message: result.isValid ? details.success : details.failure,
      details: result.details,
      error: result.error,
    };

    // Log the final response
    console.log("Security check response:", response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Security check error:", error);
    return NextResponse.json(
      { error: "Failed to validate security status" },
      { status: 500 }
    );
  }
}
