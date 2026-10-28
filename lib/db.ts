import { neon } from "@neondatabase/serverless";

let initialized = false;
let initializing: Promise<void> | null = null;

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();

  if (!url) {
    throw new Error(
      "DATABASE_URL is missing. Add your PostgreSQL connection string to .env.local."
    );
  }

  return url;
}

export const sql = neon(getDatabaseUrl());

async function initializeDatabase() {
  if (initialized) return;

  if (!initializing) {
    initializing = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

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

      await sql`
        CREATE INDEX IF NOT EXISTS idx_users_email
        ON users(email)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_polar_external_customer
        ON polar_webhook_events(external_customer_id)
      `;

      initialized = true;
    })().catch((error) => {
      initializing = null;
      throw error;
    });
  }

  await initializing;
}

export type DbUser = {
  id: string;
  name: string | null;
  email: string;
  password_hash: string;
  created_at: string;
};

export async function findUserByEmail(email: string) {
  await initializeDatabase();

  const rows = await sql`
    SELECT id, name, email, password_hash, created_at
    FROM users
    WHERE email = ${email}
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
    INSERT INTO users (id, name, email, password_hash)
    VALUES (
      ${user.id},
      ${user.name || null},
      ${user.email},
      ${user.passwordHash}
    )
    RETURNING id, name, email, password_hash, created_at
  `;

  return rows[0] as DbUser;
}

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
  `;
}

export async function getDatabaseHealth() {
  await initializeDatabase();
  const rows = await sql`SELECT NOW() AS now`;
  return rows[0];
}
