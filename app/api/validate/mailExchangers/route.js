import { NextResponse } from "next/server";
import { validateMailExchangers } from "../../../utils/advancedDomainValidators";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      console.log("Mail exchangers check: No email provided");
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const domain = email.split("@")[1];
    if (!domain) {
      console.log("Mail exchangers check: Invalid email format");
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    console.log("Mail exchangers check starting for domain:", domain);
    const result = await validateMailExchangers(domain);
    console.log("Mail exchangers check result:", {
      domain,
      isValid: result.isValid,
      confidence: result.confidence,
      factors: result.factors,
      details: result.details,
    });

    return NextResponse.json({
      check: "mailExchangers",
      email,
      ...result,
      message: result.isValid
        ? "Mail exchangers are properly configured and responsive"
        : "Issues detected with mail exchangers",
      details: {
        what: "Validates mail exchanger configuration and responsiveness",
        why: "Ensures the email domain has properly configured and active mail servers",
        standards: [
          "SMTP protocol standards",
          "DNS MX record configuration",
          "RBL (Real-time Blackhole List) checks",
        ],
        recommendations: [
          "Ensure mail servers are properly configured",
          "Monitor mail server blacklist status",
          "Maintain multiple mail exchangers for redundancy",
        ],
        ...result.details,
      },
    });
  } catch (error) {
    console.error("Mail exchangers check error:", error);
    return NextResponse.json(
      { error: "Failed to validate mail exchangers" },
      { status: 500 }
    );
  }
}
