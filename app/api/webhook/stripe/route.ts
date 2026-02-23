import { NextResponse } from "next/server";
import Stripe from "stripe";
import { markOrderPaidFromSession, recordEvent } from "../../../../src/lib/paywall-store";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2022-11-15" })
  : null;

export async function POST(req: Request) {
  if (!stripe || !stripeWebhookSecret) {
    return NextResponse.json(
      { error: "Missing Stripe server configuration." },
      { status: 500 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, stripeWebhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : null;

      await markOrderPaidFromSession({
        webhookEventId: event.id,
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
      });
    } else {
      await recordEvent({
        type: "webhook.ignored",
        payload: { eventId: event.id, eventType: event.type },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook handling failed";
    await recordEvent({
      type: "webhook.failed",
      payload: { eventId: event.id, message },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
