import { Webhooks } from "@polar-sh/nextjs";
import { recordPolarWebhook } from "@/lib/db";

export const runtime = "nodejs";

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onPayload: async (payload: any) => {
    try {
      const data = payload?.data || {};
      await recordPolarWebhook({
        eventType: String(payload?.type || "unknown"),
        eventId: data?.id ? String(data.id) : null,
        externalCustomerId: data?.customer?.external_id
          ? String(data.customer.external_id)
          : null,
        subscriptionId:
          data?.customer_id && String(payload?.type || "").startsWith("subscription.")
            ? String(data.id || "")
            : null,
        status: data?.status ? String(data.status) : null,
        payload: JSON.stringify(payload)
      });
    } catch (error) {
      console.error("Polar webhook persistence failed:", error);
    }
  }
});
