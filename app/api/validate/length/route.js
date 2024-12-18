import { NextResponse } from "next/server";
import { validateLength } from "../../../utils/validators";
import { CHECK_DETAILS } from "../../../constants/checkDetails";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const { isValid, confidence, factors, localLength, totalLength } =
      validateLength(email);
    const details = CHECK_DETAILS.length;

    return NextResponse.json({
      check: "length",
      email,
      isValid,
      confidence,
      factors,
      message: isValid ? details.success : details.failure,
      details: details.details,
      metrics: {
        localLength,
        totalLength,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
