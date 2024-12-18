import { NextResponse } from "next/server";
import { validateInternationalizedEmail } from "../../../utils/advancedDomainValidators";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      console.log("Internationalization check: No email provided");
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    console.log("Internationalization check starting for:", email);
    const result = await validateInternationalizedEmail(email);
    console.log("Internationalization check result:", {
      email,
      isValid: result.isValid,
      confidence: result.confidence,
      factors: result.factors,
      details: result.details,
    });

    return NextResponse.json({
      check: "internationalized",
      email,
      ...result,
      message: result.isValid
        ? "Email uses standard ASCII characters or valid internationalization"
        : "Email contains potentially problematic non-ASCII characters",
      details: {
        what: "Validates internationalized email address format and encoding",
        why: "Non-ASCII characters can cause deliverability issues with some email systems",
        standards: [
          "IDNA (Internationalizing Domain Names in Applications)",
          "RFC 6530 - SMTP Extension for Internationalized Email",
          "Punycode encoding standards",
        ],
        recommendations: [
          "Use ASCII characters in the local part when possible",
          "Ensure proper Punycode encoding for internationalized domain names",
          "Consider providing ASCII alternatives for non-ASCII addresses",
        ],
        ...result.details,
      },
    });
  } catch (error) {
    console.error("Internationalized email check error:", error);
    return NextResponse.json(
      { error: "Failed to validate internationalized email format" },
      { status: 500 }
    );
  }
}
