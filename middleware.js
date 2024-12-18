import { NextResponse } from "next/server";

export async function middleware(request) {
  // Simple pass-through middleware
  return NextResponse.next();
}
