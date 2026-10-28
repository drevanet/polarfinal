
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPolarCustomerState } from "@/lib/polar";

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

    const state = await getPolarCustomerState(user.id);

    // No matching Polar customer means no subscription
    // has been associated with this external user ID.
    if (!state) {
      return NextResponse.json({
        authenticated: true,
        active: false,
        subscriptions: [],
        customerFound: false,
      });
    }

    const activeSubscriptions = Array.isArray(
      state.active_subscriptions
    )
      ? state.active_subscriptions
      : [];

    return NextResponse.json({
      authenticated: true,
      active: activeSubscriptions.length > 0,
      customerFound: true,
      subscriptions: activeSubscriptions.map((subscription) => ({
        id: subscription.id,
        productId: subscription.product_id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      })),
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
