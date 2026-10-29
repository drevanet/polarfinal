
import { Webhooks } from "@polar-sh/nextjs";
import {
  recordPolarWebhook,
  upsertPolarSubscription,
} from "@/lib/db";

export const runtime = "nodejs";

const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

if (!webhookSecret) {
  throw new Error("POLAR_WEBHOOK_SECRET is not configured");
}

export const POST = Webhooks({
  webhookSecret,

  onPayload: async (payload: any) => {
    const eventType = String(payload?.type ?? "unknown");
    const data = payload?.data ?? {};

    const subscriptionEvent = eventType.startsWith("subscription.");

    const externalCustomerId =
      data?.customer?.external_id != null
        ? String(data.customer.external_id)
        : null;

    const subscriptionId =
      subscriptionEvent && data?.id != null
        ? String(data.id)
        : null;

    const status =
      data?.status != null ? String(data.status) : null;

    console.info("[Polar] Received event", {
      eventType,
      subscriptionId,
      status,
      externalCustomerId,
    });

    // Persist the original event for debugging and audit purposes.
    await recordPolarWebhook({
      eventType,
      eventId: null,
      externalCustomerId,
      subscriptionId,
      status,
      payload,
    });

    // Only subscription events update subscription records.
    if (!subscriptionEvent) {
      return;
    }

    if (!subscriptionId) {
      throw new Error(
        `Polar event ${eventType} has no subscription ID`
      );
    }

    if (!externalCustomerId) {
      throw new Error(
        `Polar event ${eventType} has no customer external_id. ` +
        "Set external_customer_id to the authenticated Betty user ID in checkout."
      );
    }

    // Explicitly handle lifecycle events where needed.
    let normalizedStatus = status ?? "unknown";

    if (eventType === "subscription.active") {
      normalizedStatus = "active";
    } else if (eventType === "subscription.revoked") {
      normalizedStatus = "revoked";
    } else if (eventType === "subscription.past_due") {
      normalizedStatus = "past_due";
    } else if (
      eventType === "subscription.canceled" &&
      !status
    ) {
      normalizedStatus = "canceled";
    }

    await upsertPolarSubscription({
      externalCustomerId,
      subscriptionId,
      customerId:
        data?.customer_id != null
          ? String(data.customer_id)
          : data?.customer?.id != null
            ? String(data.customer.id)
            : null,
      productId:
        data?.product_id != null
          ? String(data.product_id)
          : data?.product?.id != null
            ? String(data.product.id)
            : null,
      status: normalizedStatus,
      currentPeriodEnd:
        data?.current_period_end != null
          ? String(data.current_period_end)
          : null,
      cancelAtPeriodEnd: Boolean(data?.cancel_at_period_end),
      payload,
    });

    console.info("[Polar] Subscription saved", {
      subscriptionId,
      userId: externalCustomerId,
      status: normalizedStatus,
    });
  },
});
