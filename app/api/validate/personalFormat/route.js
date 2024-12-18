import { NextResponse } from "next/server";
import { validatePersonalFormat } from "../../../utils/personalFormatValidator";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const result = await validatePersonalFormat(email);

    return NextResponse.json({
      check: "personalFormat",
      email,
      ...result,
      message: result.isValid
        ? "Email appears to be in a personal format"
        : "Email does not appear to be in a personal format",
      details: {
        ...result.details,
        what: "Checks if the email follows a personal name format",
        why: "Personal email addresses often follow firstname or firstname.lastname patterns",
        standards: [
          "Common name patterns",
          "First name databases",
          "Name format analysis",
        ],
        recommendations: [
          "Use your real name for personal email addresses",
          "Consider firstname.lastname format for professional use",
          "Avoid random strings or numbers for personal communication",
        ],
      },
    });
  } catch (error) {
    console.error("Personal format validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate personal format" },
      { status: 500 }
    );
  }
}
