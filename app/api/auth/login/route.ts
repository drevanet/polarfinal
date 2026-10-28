import { NextResponse } from "next/server";
import {
  findUserByEmail,
  verifyPassword,
  attachSessionCookie
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    const user = await findUserByEmail(email);

    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

    await attachSessionCookie(response, {
      id: user.id,
      email: user.email
    });

    return response;
  } catch (error: any) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? String(error?.message || "Unable to sign in.")
            : "Unable to sign in. Please try again."
      },
      { status: 500 }
    );
  }
}
