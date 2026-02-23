import { NextResponse } from "next/server";
import { createPreviewRequest, recordEvent } from "../../../src/lib/paywall-store";
import { validateReadingInput } from "../../../src/lib/reading-validation";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const readingInput = validateReadingInput(body?.data);
    const reading = await createPreviewRequest(readingInput);

    return NextResponse.json({
      readingId: reading.id,
      mode: "preview",
      previewResult: reading.previewResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    await recordEvent({
      type: "preview.request_failed",
      payload: { message },
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
