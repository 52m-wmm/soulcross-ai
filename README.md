# SoulCross AI Paywall Demo (Next.js + Stripe)

This project demonstrates a SaaS paywall flow for a relationship reading app:
- Free Preview: limited output, always available
- Full Reading: unlocked only after Stripe payment confirmation via webhook

## Tech
- Next.js 14 App Router
- TypeScript
- Stripe Checkout + Stripe Webhook signature verification
- File-based JSON storage (`data/paywall-db.json`) for demo only

## Paywall Flow
1. User submits form with Person A/B data
2. `POST /api/preview` returns a limited preview and stores `reading_request`
3. `POST /api/checkout` creates (or reuses) order + Stripe Checkout session
4. Stripe sends `checkout.session.completed` to `POST /api/webhook/stripe`
5. Webhook verifies signature, marks order `paid`, generates full report exactly once
6. `GET /api/reading/:id` serves preview/full state for `/reading/[id]`

## Data Model (Demo)
- `reading_request`
  - id, createdAt, mode (`preview`/`full`), personA/personB payload
  - previewResult, fullResult
- `order`
  - id, readingRequestId, stripeSessionId, status (`pending`/`paid`), idempotencyKey

## Local Setup
1. Install dependencies
```bash
npm install
```

2. Create env file
```bash
cp .env.example .env.local
```

3. Fill Stripe and API envs in `.env.local`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_BASE_URL=http://localhost:3000`

4. Run app
```bash
npm run dev
```

## Stripe Webhook (Required for Full Unlock)
1. Start local forwarding
```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

2. Copy the printed webhook signing secret into `.env.local`
```env
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

3. Restart Next.js dev server after updating env

## Test Card
Use Stripe test card:
- Card number: `4242 4242 4242 4242`
- Any future date
- Any CVC
- Any ZIP

## Verify Idempotency
1. Click unlock repeatedly with same input
- Expected: same order/session reused, no duplicate full report records

2. Trigger duplicate webhook events
```bash
stripe trigger checkout.session.completed
stripe trigger checkout.session.completed
```
- Expected: first event updates to paid and generates full report
- Later duplicates do not generate additional reports

## Security Notes
- Full report is generated only on server after verified paid webhook
- Frontend button state is not trusted for authorization
- Webhook signature is verified using raw request body
- Secrets must stay in env files, never in source code

## Demo Storage Limitation
`data/paywall-db.json` is for portfolio/demo convenience.
For production, use a real database (Postgres/MySQL/Supabase/Neon) with transactional guarantees.
