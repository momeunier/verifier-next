import { NextResponse } from "next/server";
import { validateFormat } from "../../../utils/validators";
import { CHECK_DETAILS } from "../../../constants/checkDetails";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const { isValid, confidence, factors } = validateFormat(email);
    const details = CHECK_DETAILS.format;

    return NextResponse.json({
      check: "format",
      email,
      isValid,
      confidence,
      factors,
      message: isValid ? details.success : details.failure,
      details: details.details,
    });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
