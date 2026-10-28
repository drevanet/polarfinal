import { CustomerPortal } from "@polar-sh/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const portalHandler = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/editor`,
  server: process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production",
  getCustomerId: async () => {
    const user = await getCurrentUser();
    return user?.id || "";
  }
});

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!process.env.POLAR_ACCESS_TOKEN) {
    return NextResponse.json({ error: "Polar is not configured." }, { status: 500 });
  }

  return portalHandler(request);
}
