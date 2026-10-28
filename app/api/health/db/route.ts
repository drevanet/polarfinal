import { NextResponse } from "next/server";
import { getDatabaseHealth } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getDatabaseHealth();

    return NextResponse.json({
      ok: true,
      database: "postgresql",
      serverTime: result.now
    });
  } catch (error: any) {
    console.error("DATABASE HEALTH ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        database: "postgresql",
        error:
          process.env.NODE_ENV === "development"
            ? String(error?.message || "Database connection failed.")
            : "Database connection failed."
      },
      { status: 500 }
    );
  }
}
