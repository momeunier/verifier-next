import { NextResponse } from "next/server";
import { initializeApp } from "../../utils/initializeApp";
import { logStep, logError } from "../../utils/logging";

export async function GET() {
  try {
    logStep("info", "Starting initialization endpoint");

    const result = await initializeApp();
    logStep("info", "Initialization completed", JSON.stringify(result));

    return NextResponse.json(result);
  } catch (error) {
    logError("initialize", "Initialization failed", error);
    return NextResponse.json(
      { error: "Initialization failed", details: error.message },
      { status: 500 }
    );
  }
}
