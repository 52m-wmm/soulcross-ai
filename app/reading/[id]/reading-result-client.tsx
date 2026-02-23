"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

interface ReadingApiResponse {
  reading: {
    id: string;
    mode: "preview" | "full";
    previewResult: {
      title: string;
      summary: string;
      highlights: string[];
      upgradeHint: string;
    } | null;
    fullResult: {
      title: string;
      overview: string;
      strengths: string[];
      tensions: string[];
      guidance: string[];
      finalMessage: string;
    } | null;
  };
  order: {
    id: string;
    status: "pending" | "paid";
    amountCents: number;
    currency: string;
  } | null;
  isFullUnlocked: boolean;
}

export default function ReadingResultClient({ readingId }: { readingId: string }) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReadingApiResponse | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const checkoutState = searchParams?.get("checkout");
  const hasSessionId = Boolean(searchParams?.get("session_id"));

  const fetchReading = async () => {
    try {
      setError(null);
      const res = await fetch(`/api/reading/${readingId}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Failed to load reading");
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reading");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReading();
  }, [readingId]);

  useEffect(() => {
    if (!hasSessionId) return;
    if (data?.isFullUnlocked) return;

    const timer = setInterval(() => {
      fetchReading();
    }, 3000);

    return () => clearInterval(timer);
  }, [hasSessionId, data?.isFullUnlocked]);

  const priceLabel = useMemo(() => {
    if (!data?.order) return "$9.99";
    const value = (data.order.amountCents / 100).toFixed(2);
    return `${data.order.currency.toUpperCase()} ${value}`;
  }, [data]);

  const startUpgrade = async () => {
    try {
      setCheckoutLoading(true);
      setError(null);

      if (!stripePromise) {
        throw new Error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in client env");
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readingRequestId: readingId }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Checkout request failed");
      }

      if (json?.alreadyPaid) {
        await fetchReading();
        setCheckoutLoading(false);
        return;
      }

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe failed to load");
      }

      const result = await stripe.redirectToCheckout({ sessionId: json.sessionId });
      if (result?.error?.message) {
        throw new Error(result.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start checkout");
      setCheckoutLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Relationship Reading</h1>

        {checkoutState === "success" && (
          <div className="mb-5 rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-green-200">
            Payment submitted. Waiting for confirmation from Stripe webhook...
          </div>
        )}

        {checkoutState === "canceled" && (
          <div className="mb-5 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-yellow-200">
            Checkout canceled. You can continue with preview or retry unlock.
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-6 text-gray-300">
            Loading reading...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-6">
            {!data.isFullUnlocked && data.reading.previewResult && (
              <section className="rounded-2xl border border-gray-700 bg-gray-800/50 p-6">
                <div className="mb-3 inline-flex items-center rounded-full border border-blue-400/60 bg-blue-400/10 px-3 py-1 text-xs font-semibold text-blue-200">
                  Preview
                </div>
                <h2 className="text-2xl font-semibold mb-3">{data.reading.previewResult.title}</h2>
                <p className="text-gray-200 mb-4">{data.reading.previewResult.summary}</p>
                <ul className="list-disc pl-6 space-y-2 text-gray-200 mb-4">
                  {data.reading.previewResult.highlights.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
                <p className="text-gray-300 mb-5">{data.reading.previewResult.upgradeHint}</p>
                <button
                  type="button"
                  onClick={startUpgrade}
                  disabled={checkoutLoading}
                  className="rounded-xl bg-green-600 hover:bg-green-500 px-5 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {checkoutLoading
                    ? "Redirecting..."
                    : `Unlock Full Reading (${priceLabel})`}
                </button>
              </section>
            )}

            {data.isFullUnlocked && data.reading.fullResult && (
              <section className="rounded-2xl border border-emerald-500/50 bg-emerald-500/10 p-6">
                <div className="mb-3 inline-flex items-center rounded-full border border-emerald-400/60 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  Full Reading Unlocked
                </div>
                <h2 className="text-2xl font-semibold mb-3">{data.reading.fullResult.title}</h2>
                <p className="text-gray-100 mb-4">{data.reading.fullResult.overview}</p>

                <h3 className="font-semibold text-lg mb-2">Strengths</h3>
                <ul className="list-disc pl-6 space-y-1 mb-4 text-gray-100">
                  {data.reading.fullResult.strengths.map((item, idx) => (
                    <li key={`s-${idx}`}>{item}</li>
                  ))}
                </ul>

                <h3 className="font-semibold text-lg mb-2">Tension Points</h3>
                <ul className="list-disc pl-6 space-y-1 mb-4 text-gray-100">
                  {data.reading.fullResult.tensions.map((item, idx) => (
                    <li key={`t-${idx}`}>{item}</li>
                  ))}
                </ul>

                <h3 className="font-semibold text-lg mb-2">Guidance</h3>
                <ul className="list-disc pl-6 space-y-1 mb-4 text-gray-100">
                  {data.reading.fullResult.guidance.map((item, idx) => (
                    <li key={`g-${idx}`}>{item}</li>
                  ))}
                </ul>

                <p className="text-gray-100">{data.reading.fullResult.finalMessage}</p>
              </section>
            )}

            {!data.reading.previewResult && !data.reading.fullResult && (
              <section className="rounded-2xl border border-gray-700 bg-gray-800/50 p-6 text-gray-300">
                Empty result. Start with free preview from the analysis page.
              </section>
            )}

            {!data.isFullUnlocked && data.order?.status === "pending" && (
              <section className="rounded-2xl border border-gray-700 bg-gray-800/40 p-5 text-gray-300">
                Payment status: pending. If you just paid, this page refreshes automatically after webhook confirmation.
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
