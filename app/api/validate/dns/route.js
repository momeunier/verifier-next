import { NextResponse } from "next/server";
import { validateDNS } from "../../../utils/validators";
import { CHECK_DETAILS } from "../../../constants/checkDetails";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      console.log("DNS check: No email provided");
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    console.log("DNS check starting for:", email);
    const { isValid, confidence, factors, records, error } = await validateDNS(
      email
    );

    console.log("DNS check result:", {
      email,
      isValid,
      confidence,
      factors,
      records: records || [],
      error,
    });

    const details = CHECK_DETAILS.dns;

    return NextResponse.json({
      check: "dns",
      email,
      isValid,
      confidence,
      factors,
      message: isValid ? details.success : details.failure,
      details: details.details,
      records: records || [],
      error,
    });
  } catch (error) {
    console.error("DNS check error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
