# RevaBox Shot Studio

A Next.js 3D box-shot SaaS starter using:

- Next.js App Router
- TypeScript
- Tailwind CSS
- Three.js + React Three Fiber
- PostgreSQL
- Neon serverless PostgreSQL driver
- Custom HTTP-only JWT sessions
- Polar recurring subscriptions
- Polar Customer Portal
- Polar signed webhooks
- PNG export from the browser WebGL canvas

## 1. Requirements

- Node.js 20.9+
- A PostgreSQL database
- A Polar account/product for subscriptions

For Vercel/serverless deployments, Neon is a convenient PostgreSQL option. Neon provides a serverless PostgreSQL driver that works with Next.js/serverless environments. citeturn0search0turn0search5

## 2. Install

```bash
npm install
```

## 3. Create PostgreSQL

You can use Neon, Supabase, Vercel Postgres, Railway, Render, or another PostgreSQL provider.

With Neon, create a project and copy the PostgreSQL connection string. Neon documents using a `DATABASE_URL` environment variable for Next.js applications. citeturn0search0turn0search2

Create `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require

JWT_SECRET=replace-this-with-a-long-random-secret-at-least-32-characters

POLAR_SERVER=sandbox
POLAR_ACCESS_TOKEN=
POLAR_PRODUCT_ID_MONTHLY=
POLAR_PRODUCT_ID_BIWEEKLY=
POLAR_PRODUCT_ID_YEARLY=
# Optional legacy fallback for monthly only
POLAR_PRODUCT_ID=
POLAR_WEBHOOK_SECRET=

NEXT_PUBLIC_PLAN_NAME=$10/month
NEXT_PUBLIC_PLAN_PRICE_LABEL=$12/month
```

### DATABASE_URL

Do not use:

```env
DATABASE_PATH=./boxshot.db
```

That was for the old SQLite version.

Use:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

Your actual provider will give you the complete value.

Example:

```env
DATABASE_URL=postgresql://myuser:mypassword@ep-example.us-east-2.aws.neon.tech/neondb?sslmode=require
```

Never commit `.env.local` to Git.

## 4. Database schema

The application automatically creates these tables the first time it accesses PostgreSQL:

- `users`
- `polar_webhook_events`

You can also initialize them manually using:

```text
database/schema.sql
```

For example, in a PostgreSQL SQL editor, paste the contents of `database/schema.sql`.

## 5. Test the database

Start the application:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000/api/health/db
```

A successful response looks like:

```json
{
  "ok": true,
  "database": "postgresql",
  "serverTime": "..."
}
```

If you get:

```text
DATABASE_URL is missing
```

create `.env.local` and add your PostgreSQL connection string.

## 6. Create a user

Go to:

```text
http://localhost:3000/signup
```

The signup process:

1. Validates the email.
2. Checks PostgreSQL for an existing user.
3. Hashes the password with Node's `scrypt`.
4. Inserts the user into PostgreSQL.
5. Creates an HTTP-only JWT session cookie.
6. Redirects to `/editor`.

## 7. Polar

Create a recurring product in Polar.

For local development use the Polar Sandbox.

Set:

```env
POLAR_ACCESS_TOKEN=...
POLAR_PRODUCT_ID=...
POLAR_WEBHOOK_SECRET=...
POLAR_SERVER=sandbox
```

The checkout associates the Polar customer with the application's user ID.

The editor verifies subscription state directly through Polar before enabling PNG export. Configure three Polar product IDs: the 2-week plan is $7.00 every two weeks, the monthly plan is $10.00 per month and allows up to 50 projects created in the current calendar month, and the annual plan is $98.00 per year. The 2-week and annual plans have no project-count cap. Project quota enforcement is performed server-side by `/api/projects`, not just in the UI.

The customer portal is available at:

```text
/api/polar/portal
```

## 8. Polar webhook

Configure the Polar webhook URL:

```text
https://YOUR-DOMAIN.com/api/polar/webhook
```

Recommended subscription events include:

```text
subscription.created
subscription.active
subscription.updated
subscription.canceled
subscription.revoked
subscription.past_due
```

The webhook is signature-verified by Polar's Next.js adapter before your handler processes it.

The event is also stored in PostgreSQL for debugging/auditing.

## 9. Production deployment

### Vercel

Set these environment variables in your Vercel project:

```text
NEXT_PUBLIC_APP_URL
DATABASE_URL
JWT_SECRET
POLAR_ACCESS_TOKEN
POLAR_PRODUCT_ID
POLAR_WEBHOOK_SECRET
POLAR_SERVER
POLAR_PRODUCT_ID_MONTHLY
POLAR_PRODUCT_ID_BIWEEKLY
POLAR_PRODUCT_ID_YEARLY
```

For production Polar:

```env
POLAR_SERVER=production
```

Use the production Polar access token/product/webhook secret.

### PostgreSQL

For Neon, use the connection string supplied by Neon. Neon is designed for serverless use and supports the `@neondatabase/serverless` driver. citeturn0search0turn0search5

If your provider supplies a pooled connection string, use the provider's recommended pooled/serverless URL.

## 10. PostgreSQL migration from the old SQLite version

The old project used:

```text
boxshot.db
```

The new project does not use SQLite at all.

You can safely remove these old files:

```text
boxshot.db
boxshot.db-shm
boxshot.db-wal
```

The new application reads only:

```text
DATABASE_URL
```

## 11. Production recommendations

For a real SaaS launch:

- Use managed PostgreSQL.
- Keep `DATABASE_URL` server-only.
- Keep `JWT_SECRET` server-only.
- Use separate Polar Sandbox and Production environments.
- Configure the Polar production webhook.
- Put the application behind HTTPS.
- Consider a managed authentication provider if you need Google/Apple/social login.
- Move large artwork files to object storage instead of storing them in PostgreSQL.
- If export must be impossible to bypass, perform the final export in a trusted server-side worker that checks the user's subscription.

## Project structure

```text
boxshot-studio/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   ├── health/
│   │   ├── polar/
│   │   └── subscription/
│   ├── editor/
│   ├── login/
│   ├── pricing/
│   ├── signup/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AuthForm.tsx
│   ├── BoxScene.tsx
│   ├── Editor.tsx
│   └── Navbar.tsx
├── database/
│   └── schema.sql
├── lib/
│   ├── auth.ts
│   ├── db.ts
│   ├── polar.ts
│   └── utils.ts
├── public/
├── .env.example
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```
