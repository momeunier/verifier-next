import { NextResponse } from "next/server";
import { validateRole } from "../../../utils/validators";
import { CHECK_DETAILS } from "../../../constants/checkDetails";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const { isValid, confidence, factors, detectedRole } = validateRole(email);
    const details = CHECK_DETAILS.role;

    return NextResponse.json({
      check: "role",
      email,
      isValid,
      confidence,
      factors,
      message: isValid ? details.success : details.failure,
      details: details.details,
      detectedRole,
    });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
