
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPolarSubscriptionByUserId } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          authenticated: false,
          active: false,
          subscriptions: [],
        },
        { status: 401 }
      );
    }

    const subscription = await getPolarSubscriptionByUserId(user.id);

    if (!subscription) {
      return NextResponse.json({
        authenticated: true,
        active: false,
        customerFound: false,
        subscriptions: [],
      });
    }

    const status = String(subscription.status).toLowerCase();

    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end)
      : null;

    const periodValid =
      periodEnd !== null &&
      !Number.isNaN(periodEnd.getTime()) &&
      periodEnd.getTime() > Date.now();

    // Trialing subscriptions may also grant access.
    // A cancellation scheduled for period end does not
    // immediately remove access while the paid period remains valid.
    const active =
      (status === "active" || status === "trialing") &&
      periodValid;

    return NextResponse.json({
      authenticated: true,
      active,
      customerFound: true,
      subscriptions: [
        {
          id: subscription.subscription_id,
          productId: subscription.product_id,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      ],
    });
  } catch (error) {
    console.error("Subscription lookup failed:", error);

    return NextResponse.json(
      {
        authenticated: true,
        active: false,
        subscriptions: [],
        error: "Unable to verify your subscription. Please try again.",
      },
      { status: 503 }
    );
  }
}
