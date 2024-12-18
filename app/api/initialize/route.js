import { NextResponse } from "next/server";
import { initializeLists } from "../../utils/listManager";

export const dynamic = "force-dynamic"; // Ensure this is not cached

export async function GET() {
  try {
    const result = await initializeLists();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Initialization error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
