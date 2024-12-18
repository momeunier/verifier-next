import { NextResponse } from "next/server";
import { validateReputableProvider } from "../../../utils/advancedValidators";
import { CHECK_DETAILS } from "../../../constants/checkDetails";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const result = await validateReputableProvider(email);
    const details = CHECK_DETAILS.reputableProvider;

    // If not a reputable provider, return a neutral response
    if (result.confidence === null) {
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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Reputable provider check error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
