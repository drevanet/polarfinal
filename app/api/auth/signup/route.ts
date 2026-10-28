import { NextResponse } from "next/server";
import {
  createUser,
  hashPassword,
  attachSessionCookie,
  findUserByEmail
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name || "").trim().slice(0, 100);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const existing = await findUserByEmail(email);

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists. Try signing in." },
        { status: 409 }
      );
    }

    const user = await createUser({
      name,
      email,
      passwordHash: hashPassword(password)
    });

    const response = NextResponse.json(
      { ok: true, user },
      { status: 201 }
    );

    await attachSessionCookie(response, user);

    return response;
  } catch (error: any) {
    console.error("SIGNUP ERROR:", error);

    const message = String(error?.message || "");

    if (message.includes("DATABASE_URL")) {
      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
    }

    if (message.includes("JWT_SECRET")) {
      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
    }

    if (
      message.includes("duplicate key") ||
      message.includes("users_email_key") ||
      message.includes("UNIQUE")
    ) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? `Unable to create account: ${message}`
            : "Unable to create account. Please try again."
      },
      { status: 500 }
    );
  }
}
