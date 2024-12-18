import { NextResponse } from "next/server";
import { validatePlusAddressing } from "../../../utils/advancedValidators";
import { CHECK_DETAILS } from "../../../constants/checkDetails";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const result = await validatePlusAddressing(email);
    const details = CHECK_DETAILS.plusAddressing;

    // Only include this check in the results if plus addressing is used
    if (result.confidence === null) {
      return NextResponse.json({
        check: "plusAddressing",
        email,
        isValid: true,
        confidence: null, // This will make the UI ignore this check in the overall score
        factors: result.factors,
        message: details.failure, // Just informational
        details: details.details,
      });
    }

    return NextResponse.json({
      check: "plusAddressing",
      email,
      isValid: result.isValid,
      confidence: result.confidence,
      factors: result.factors,
      message: details.success,
      details: {
        ...details.details,
        ...result.details,
      },
    });
  } catch (error) {
    console.error("Plus addressing check error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
