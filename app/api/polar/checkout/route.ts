import { Checkout } from "@polar-sh/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const productByPlan: Record<string, string | undefined> = {
  monthly: process.env.POLAR_PRODUCT_ID_MONTHLY || process.env.POLAR_PRODUCT_ID,
  biweekly: process.env.POLAR_PRODUCT_ID_BIWEEKLY,
  yearly: process.env.POLAR_PRODUCT_ID_YEARLY,
};

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    const loginUrl = new URL("/login?next=/pricing", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const plan = request.nextUrl.searchParams.get("plan") || "monthly";
  if (!(plan in productByPlan)) {
    return NextResponse.json({ error: "Unknown subscription plan." }, { status: 400 });
  }

  const productId = productByPlan[plan];
  const accessToken = process.env.POLAR_ACCESS_TOKEN?.trim();
  if (!accessToken || !productId) {
    return NextResponse.json({
      error: `Polar is not configured for the ${plan} plan. Set POLAR_ACCESS_TOKEN and the matching Polar product ID environment variable.`,
    }, { status: 500 });
  }

  const checkoutHandler = Checkout({
    accessToken,
    successUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/editor?checkout=success`,
    returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/pricing`,
    server: process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production",
  });

  const checkoutUrl = new URL(request.url);
  checkoutUrl.searchParams.set("products", productId);
  checkoutUrl.searchParams.set("customerExternalId", user.id);
  checkoutUrl.searchParams.set("customerEmail", user.email);
  checkoutUrl.searchParams.set("customerName", user.name || "");
  return checkoutHandler(new NextRequest(checkoutUrl));
}
