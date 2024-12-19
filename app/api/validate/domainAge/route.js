import { NextResponse } from "next/server";
import { validateDomainAge } from "../../../utils/advancedValidators";
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

    console.log("Starting domain age check for domain:", domain);
    const result = await validateDomainAge(domain);
    const details = CHECK_DETAILS.domainAge;

    // Log the validation results
    console.log("Domain age check results:", {
      domain,
      isValid: result.isValid,
      confidence: result.confidence,
      factors: result.factors,
    });

    const response = {
      check: "domainAge",
      email,
      isValid: result.isValid,
      confidence: result.confidence,
      factors: result.factors,
      message: result.isValid ? details.success : details.failure,
      details: result.details,
      error: result.error,
    };

    // Log the final response
    console.log("Domain age check response:", response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Domain age check error:", error);
    return NextResponse.json(
      { error: "Failed to validate domain age" },
      { status: 500 }
    );
  }
}
