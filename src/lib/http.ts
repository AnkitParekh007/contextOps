import { NextResponse } from "next/server";
import { ZodError } from "zod";
export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
export function handleApiError(error: unknown) {
  if (error instanceof ZodError) return apiError("Invalid input", 422);
  console.error("API request failed", error instanceof Error ? error.message : "unknown error");
  return apiError("Request could not be completed", 500);
}
