
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getPolarCustomerState } from "@/lib/polar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONTHLY_PRODUCT_ID =
  process.env.POLAR_PRODUCT_ID_MONTHLY ||
  process.env.POLAR_PRODUCT_ID;

const BIWEEKLY_PRODUCT_ID =
  process.env.POLAR_PRODUCT_ID_BIWEEKLY;

const YEARLY_PRODUCT_ID =
  process.env.POLAR_PRODUCT_ID_YEARLY;

type Subscription = {
  id?: string;
  product_id?: string | null;
  status?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
};

type CustomerState = {
  active_subscriptions?: Subscription[];
} | null;

type Plan = "monthly" | "biweekly" | "yearly" | "none";

function getActiveSubscriptions(
  state: CustomerState
): Subscription[] {
  if (!Array.isArray(state?.active_subscriptions)) {
    return [];
  }

  return state.active_subscriptions.filter(
    (subscription) =>
      !subscription.status ||
      subscription.status === "active" ||
      subscription.status === "trialing"
  );
}

function getPlan(subscriptions: Subscription[]): Plan {
  const productIds = subscriptions.map((subscription) =>
    String(subscription.product_id || "")
  );

  if (
    YEARLY_PRODUCT_ID &&
    productIds.includes(YEARLY_PRODUCT_ID)
  ) {
    return "yearly";
  }

  if (
    MONTHLY_PRODUCT_ID &&
    productIds.includes(MONTHLY_PRODUCT_ID)
  ) {
    return "monthly";
  }

  if (
    BIWEEKLY_PRODUCT_ID &&
    productIds.includes(BIWEEKLY_PRODUCT_ID)
  ) {
    return "biweekly";
  }

  return "none";
}

async function ensureProjectsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_projects_user_created
    ON projects(user_id, created_at)
  `;
}

async function getMonthlyProjectCount(userId: string) {
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM projects
    WHERE user_id = ${userId}
      AND created_at >= date_trunc('month', NOW())
  `;

  return Number(rows[0]?.count || 0);
}

async function getVerifiedState(userId: string) {
  try {
    return await getPolarCustomerState(userId);
  } catch (error) {
    console.error("POLAR SUBSCRIPTION VERIFICATION ERROR:", error);

    return undefined;
  }
}

// GET /api/projects
// Returns project usage and subscription information.
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    await ensureProjectsTable();

    const state = await getVerifiedState(user.id);

    // undefined means Polar returned an API error.
    // null means no matching Polar customer was found.
    if (state === undefined) {
      return NextResponse.json(
        {
          error: "Unable to verify your subscription right now.",
          code: "SUBSCRIPTION_VERIFICATION_FAILED",
        },
        { status: 503 }
      );
    }

    const activeSubscriptions = getActiveSubscriptions(
      state as CustomerState
    );

    const plan = getPlan(activeSubscriptions);
    const count = await getMonthlyProjectCount(user.id);

    return NextResponse.json({
      count,
      monthlyLimit: plan === "monthly" ? 50 : null,
      plan,
      active: activeSubscriptions.length > 0,
    });
  } catch (error) {
    console.error("PROJECT COUNT ERROR:", error);

    return NextResponse.json(
      { error: "Unable to load project usage." },
      { status: 500 }
    );
  }
}

// POST /api/projects
// Creates a project only after subscription verification.
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    await ensureProjectsTable();

    const body = await request.json().catch(() => ({}));

    const name =
      typeof body?.name === "string"
        ? body.name.trim().slice(0, 120) ||
          "Untitled box project"
        : "Untitled box project";

    const state = await getVerifiedState(user.id);

    if (state === undefined) {
      return NextResponse.json(
        {
          error: "Unable to verify your subscription. Please try again.",
          code: "SUBSCRIPTION_VERIFICATION_FAILED",
        },
        { status: 503 }
      );
    }

    const activeSubscriptions = getActiveSubscriptions(
      state as CustomerState
    );

    if (activeSubscriptions.length === 0) {
      return NextResponse.json(
        {
          error:
            "An active subscription is required to create a project.",
          code: "SUBSCRIPTION_REQUIRED",
        },
        { status: 402 }
      );
    }

    const plan = getPlan(activeSubscriptions);

    // Only the monthly plan has a 50-project monthly limit.
    // Biweekly and yearly plans remain unlimited in this version.
    if (plan === "monthly") {
      const count = await getMonthlyProjectCount(user.id);

      if (count >= 50) {
        return NextResponse.json(
          {
            error:
              "You have reached the 50-project limit for this month. You can create more projects next month or switch plans.",
            code: "MONTHLY_PROJECT_LIMIT",
            count,
            limit: 50,
          },
          { status: 429 }
        );
      }
    }

    const id = `prj_${randomUUID().replaceAll("-", "")}`;

    const rows = await sql`
      INSERT INTO projects (id, user_id, name)
      VALUES (${id}, ${user.id}, ${name})
      RETURNING id, name, created_at
    `;

    const count = await getMonthlyProjectCount(user.id);

    return NextResponse.json(
      {
        project: rows[0],
        count,
        monthlyLimit: plan === "monthly" ? 50 : null,
        plan,
        active: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE PROJECT ERROR:", error);

    return NextResponse.json(
      { error: "Unable to create project." },
      { status: 500 }
    );
  }
}
