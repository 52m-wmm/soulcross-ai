import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  attachStripeSessionToOrder,
  buildCheckoutIdempotencyKey,
  createOrReuseFullOrder,
  createOrReuseOrderForExistingReading,
} from "../../../src/lib/paywall-store";
import { validateReadingInput } from "../../../src/lib/reading-validation";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2022-11-15" })
  : null;

const DEFAULT_PRICE_CENTS = 999;

export async function POST(req: Request) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY on server." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const amountCents = Number(process.env.FULL_READING_PRICE_CENTS || DEFAULT_PRICE_CENTS);
    const currency = (process.env.FULL_READING_CURRENCY || "usd").toLowerCase();

    const upserted = body?.readingRequestId
      ? await createOrReuseOrderForExistingReading({
          readingId: String(body.readingRequestId),
          amountCents,
          currency,
        })
      : await (() => {
          const readingInput = validateReadingInput(body?.data);
          const idempotencyKey = buildCheckoutIdempotencyKey(
            readingInput,
            amountCents,
            currency
          );

          return createOrReuseFullOrder({
            readingInput,
            idempotencyKey,
            amountCents,
            currency,
          });
        })();

    const { reading, order } = upserted;

    if (order.status === "paid" && reading.fullResult) {
      return NextResponse.json({
        alreadyPaid: true,
        readingId: reading.id,
      });
    }

    if (order.stripeSessionId) {
      return NextResponse.json({
        sessionId: order.stripeSessionId,
        readingId: reading.id,
        alreadyPaid: false,
      });
    }

    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:3000";

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: "SoulCross Full Relationship Reading",
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/reading/${reading.id}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/reading/${reading.id}?checkout=canceled`,
        metadata: {
          readingRequestId: reading.id,
          orderId: order.id,
          idempotencyKey: order.idempotencyKey,
        },
      },
      {
        idempotencyKey: order.idempotencyKey,
      }
    );

    await attachStripeSessionToOrder({
      orderId: order.id,
      stripeSessionId: session.id,
    });

    return NextResponse.json({
      sessionId: session.id,
      readingId: reading.id,
      alreadyPaid: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
