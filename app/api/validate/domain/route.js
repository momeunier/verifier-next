import { NextResponse } from "next/server";
import { validateDomain } from "../../../utils/validators";
import { CHECK_DETAILS } from "../../../constants/checkDetails";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const { isValid, confidence, factors, domain } = validateDomain(email);
    const details = CHECK_DETAILS.domain;

    return NextResponse.json({
      check: "domain",
      email,
      isValid,
      confidence,
      factors,
      message: isValid ? details.success : details.failure,
      details: details.details,
      domain,
    });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
