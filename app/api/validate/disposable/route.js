import { NextResponse } from "next/server";
import { validateDisposable } from "../../../utils/advancedValidators";
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

    const { isValid, confidence, factors } = await validateDisposable(email);
    const details = CHECK_DETAILS.disposable;

    // Log the validation results
    console.log("Disposable check results:", {
      email,
      isValid,
      confidence,
      factors,
    });

    const response = {
      check: "disposable",
      email,
      isValid,
      confidence,
      factors,
      message: isValid ? details.success : details.failure,
      details: details.details,
    };

    // Log the final response
    console.log("Disposable check response:", response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Disposable check error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
