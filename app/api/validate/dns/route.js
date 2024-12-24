import { NextResponse } from "next/server";
import dns from "dns";
import { logStep, logError } from "../../../utils/logging";
import { CHECK_DETAILS } from "../../../constants/checkDetails";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      logStep("warn", "DNS check: No email provided");
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    logStep("info", "DNS check starting", email);

    const [, domain] = email.split("@");
    const records = await dns.promises.resolveMx(domain);

    const result = {
      email,
      isValid: records && records.length > 0,
      confidence: records && records.length > 0 ? 1 : 0,
      factors: {},
      records,
    };

    logStep("info", "DNS check completed", JSON.stringify(result));

    const details = CHECK_DETAILS.dns;
    return NextResponse.json({
      check: "dns",
      email,
      isValid: result.isValid,
      confidence: result.confidence,
      factors: result.factors,
      message: result.isValid ? details.success : details.failure,
      details: {
        ...details.details,
        ...result,
      },
    });
  } catch (error) {
    logError("dns", "DNS check failed", error);
    return NextResponse.json({
      isValid: false,
      confidence: 0,
      factors: {},
      records: [],
      error: error.message,
    });
  }
}
