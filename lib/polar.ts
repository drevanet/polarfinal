
import "server-only";
import { createPolar } from "@polar-sh/sdk/2026-10";

const accessToken = process.env.POLAR_ACCESS_TOKEN;

if (!accessToken) {
  throw new Error("POLAR_ACCESS_TOKEN is missing");
}

export const polar = createPolar({
  accessToken,
  environment:
    process.env.POLAR_SERVER === "sandbox"
      ? "sandbox"
      : "production",
});

export async function getPolarCustomerState(userId: string) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    return await polar.customers.getStateExternal(userId);
  } catch (error: unknown) {
    const polarError = error as {
      statusCode?: number;
      status?: number;
      message?: string;
    };

    if (
      polarError.statusCode === 404 ||
      polarError.status === 404
    ) {
      console.warn(
        `No Polar customer found for app user ID: ${userId}`
      );

      return null;
    }

    throw error;
  }
}
