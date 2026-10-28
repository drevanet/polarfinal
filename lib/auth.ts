import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import {
  findUserByEmail as dbFindUserByEmail,
  findUserById,
  insertUser
} from "@/lib/db";

const COOKIE_NAME = "boxshot_session";

function jwtSecret() {
  const value = process.env.JWT_SECRET?.trim();

  if (!value || value.length < 32) {
    throw new Error(
      "JWT_SECRET is missing or shorter than 32 characters. Add it to .env.local and restart Next.js."
    );
  }

  return new TextEncoder().encode(value);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string) {
  try {
    const [salt, expected] = stored.split(":");

    if (!salt || !expected) return false;

    const actual = scryptSync(password, salt, 64);
    const expectedBuffer = Buffer.from(expected, "hex");

    return (
      actual.length === expectedBuffer.length &&
      timingSafeEqual(actual, expectedBuffer)
    );
  } catch {
    return false;
  }
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}) {
  const id = `usr_${randomBytes(16).toString("hex")}`;

  await insertUser({
    id,
    name: input.name,
    email: input.email,
    passwordHash: input.passwordHash
  });

  return {
    id,
    name: input.name || null,
    email: input.email
  };
}

export async function findUserByEmail(email: string) {
  return dbFindUserByEmail(email);
}

async function signSession(user: { id: string; email: string }) {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(jwtSecret());
}

export async function attachSessionCookie(
  response: NextResponse,
  user: { id: string; email: string }
) {
  const token = await signSession(user);

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return response;
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const { payload } = await jwtVerify(token, jwtSecret());
    const id = String(payload.sub || "");

    if (!id) return null;

    const user = await findUserById(id);

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email
    };
  } catch {
    return null;
  }
}
