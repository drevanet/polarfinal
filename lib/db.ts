
import { neon } from "@neondatabase/serverless";

let initialized = false;
let initializing: Promise<void> | null = null;

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();

  if (!url) {
    throw new Error(
      "DATABASE_URL is missing. Add your PostgreSQL connection string to .env.local."
    );
  }

  return url;
}

export const sql = neon(getDatabaseUrl());

async function initializeDatabase(): Promise<void> {
  if (initialized) return;

  if (!initializing) {
    initializing = (async () => {
      // Users table
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      // Polar webhook event history
      await sql`
        CREATE TABLE IF NOT EXISTS polar_webhook_events (
          id BIGSERIAL PRIMARY KEY,
          event_type TEXT NOT NULL,
          event_id TEXT,
          external_customer_id TEXT,
          subscription_id TEXT,
          status TEXT,
          payload JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      // Prevent duplicate storage of the same event ID when available.
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_polar_webhook_event_id
        ON polar_webhook_events(event_id)
        WHERE event_id IS NOT NULL
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_users_email
        ON users(email)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_polar_external_customer
        ON polar_webhook_events(external_customer_id)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_polar_webhook_subscription
        ON polar_webhook_events(subscription_id)
      `;

      // Polar subscriptions linked to Betty users
      await sql`
        CREATE TABLE IF NOT EXISTS polar_subscriptions (
          subscription_id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL
            REFERENCES users(id) ON DELETE CASCADE,
          customer_id TEXT,
          product_id TEXT,
          status TEXT NOT NULL,
          current_period_end TIMESTAMPTZ,
          cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
          payload JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_polar_subscriptions_user
        ON polar_subscriptions(user_id)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_polar_subscriptions_status
        ON polar_subscriptions(status)
      `;

      initialized = true;
    })().catch((error) => {
      initializing = null;
      throw error;
    });
  }

  await initializing;
}

// ---------------------------------------------
// Types
// ---------------------------------------------

export type DbUser = {
  id: string;
  name: string | null;
  email: string;
  password_hash: string;
  created_at: string;
};

export type PolarSubscription = {
  subscription_id: string;
  user_id: string;
  customer_id: string | null;
  product_id: string | null;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  payload: unknown;
  updated_at: string;
};

// ---------------------------------------------
// User database functions
// ---------------------------------------------

export async function findUserByEmail(email: string) {
  await initializeDatabase();

  const rows = await sql`
    SELECT id, name, email, password_hash, created_at
    FROM users
    WHERE email = ${email.trim().toLowerCase()}
    LIMIT 1
  `;

  return (rows[0] as DbUser | undefined) || undefined;
}

export async function findUserById(id: string) {
  await initializeDatabase();

  const rows = await sql`
    SELECT id, name, email, password_hash, created_at
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `;

  return (rows[0] as DbUser | undefined) || undefined;
}

export async function insertUser(user: {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}) {
  await initializeDatabase();

  const rows = await sql`
    INSERT INTO users (
      id,
      name,
      email,
      password_hash
    )
    VALUES (
      ${user.id},
      ${user.name || null},
      ${user.email.trim().toLowerCase()},
      ${user.passwordHash}
    )
    RETURNING id, name, email, password_hash, created_at
  `;

  return rows[0] as DbUser;
}

// ---------------------------------------------
// Polar webhook event logging
// ---------------------------------------------

export async function recordPolarWebhook(data: {
  eventType: string;
  eventId: string | null;
  externalCustomerId: string | null;
  subscriptionId: string | null;
  status: string | null;
  payload: unknown;
}) {
  await initializeDatabase();

  await sql`
    INSERT INTO polar_webhook_events (
      event_type,
      event_id,
      external_customer_id,
      subscription_id,
      status,
      payload
    )
    VALUES (
      ${data.eventType},
      ${data.eventId},
      ${data.externalCustomerId},
      ${data.subscriptionId},
      ${data.status},
      ${JSON.stringify(data.payload)}::jsonb
    )
    ON CONFLICT (event_id)
    WHERE event_id IS NOT NULL
    DO NOTHING
  `;
}

// ---------------------------------------------
// Create or update a Polar subscription
// ---------------------------------------------

export async function upsertPolarSubscription(data: {
  externalCustomerId: string;
  subscriptionId: string;
  customerId: string | null;
  productId: string | null;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  payload: unknown;
}) {
  await initializeDatabase();

  const rows = await sql`
    INSERT INTO polar_subscriptions (
      subscription_id,
      user_id,
      customer_id,
      product_id,
      status,
      current_period_end,
      cancel_at_period_end,
      payload,
      updated_at
    )
    SELECT
      ${data.subscriptionId},
      users.id,
      ${data.customerId},
      ${data.productId},
      ${data.status},
      ${data.currentPeriodEnd},
      ${data.cancelAtPeriodEnd},
      ${JSON.stringify(data.payload)}::jsonb,
      NOW()
    FROM users
    WHERE users.id = ${data.externalCustomerId}

    ON CONFLICT (subscription_id)
    DO UPDATE SET
      customer_id = EXCLUDED.customer_id,
      product_id = EXCLUDED.product_id,
      status = EXCLUDED.status,
      current_period_end = EXCLUDED.current_period_end,
      cancel_at_period_end = EXCLUDED.cancel_at_period_end,
      payload = EXCLUDED.payload,
      updated_at = NOW()

    RETURNING
      subscription_id,
      user_id,
      status
  `;

  if (rows.length === 0) {
    throw new Error(
      `Cannot associate Polar subscription ${data.subscriptionId} ` +
        `with Betty user ${data.externalCustomerId}. ` +
        "Verify external_customer_id in your checkout configuration."
    );
  }

  return rows[0];
}

// ---------------------------------------------
// Get a user's most recently updated subscription
// ---------------------------------------------

export async function getPolarSubscriptionByUserId(
  userId: string
): Promise<PolarSubscription | undefined> {
  await initializeDatabase();

  const rows = await sql`
    SELECT
      subscription_id,
      user_id,
      customer_id,
      product_id,
      status,
      current_period_end,
      cancel_at_period_end,
      payload,
      updated_at
    FROM polar_subscriptions
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  return (rows[0] as PolarSubscription | undefined) || undefined;
}

// ---------------------------------------------
// Database health check
// ---------------------------------------------

export async function getDatabaseHealth() {
  await initializeDatabase();

  const rows = await sql`
    SELECT NOW() AS now
  `;

  return rows[0];
}
