import { NextResponse } from "next/server";
import { validateEmailSecurity } from "../../../utils/advancedValidators";
import { CHECK_DETAILS } from "../../../constants/checkDetails";

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

    const result = await validateEmailSecurity(domain);
    const details = CHECK_DETAILS.security;

    return NextResponse.json({
      check: "security",
      email,
      isValid: result.isValid,
      confidence: result.confidence,
      factors: result.factors,
      message: result.isValid ? details.success : details.failure,
      details: result.details,
      error: result.error,
    });
  } catch (error) {
    console.error("Security check error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
