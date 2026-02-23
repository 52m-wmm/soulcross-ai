import { NextResponse } from "next/server";
import { getReadingWithOrder } from "../../../../src/lib/paywall-store";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { reading, order } = await getReadingWithOrder(params.id);

  if (!reading) {
    return NextResponse.json({ error: "Reading not found" }, { status: 404 });
  }

  const isFullUnlocked = Boolean(order?.status === "paid" && reading.fullResult);

  return NextResponse.json({
    reading: {
      id: reading.id,
      mode: reading.mode,
      createdAt: reading.createdAt,
      updatedAt: reading.updatedAt,
      previewResult: reading.previewResult,
      fullResult: isFullUnlocked ? reading.fullResult : null,
    },
    order: order
      ? {
          id: order.id,
          status: order.status,
          amountCents: order.amountCents,
          currency: order.currency,
        }
      : null,
    isFullUnlocked,
  });
}
