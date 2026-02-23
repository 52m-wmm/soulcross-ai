import { createHash, randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { generateFullReading, generatePreviewReading } from "./reading-generator";
import type {
  EventRecord,
  OrderRecord,
  PaywallDb,
  ReadingInput,
  ReadingRequestRecord,
} from "./paywall-types";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "paywall-db.json");

const EMPTY_DB: PaywallDb = {
  readingRequests: [],
  orders: [],
  events: [],
  processedWebhookEvents: [],
};

let writeQueue: Promise<unknown> = Promise.resolve();

function nowIso(): string {
  return new Date().toISOString();
}

async function ensureDbFile(): Promise<void> {
  await fs.mkdir(DB_DIR, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(EMPTY_DB, null, 2), "utf8");
  }
}

async function readDb(): Promise<PaywallDb> {
  await ensureDbFile();
  const raw = await fs.readFile(DB_PATH, "utf8");
  const parsed = JSON.parse(raw) as Partial<PaywallDb>;

  return {
    readingRequests: parsed.readingRequests || [],
    orders: parsed.orders || [],
    events: parsed.events || [],
    processedWebhookEvents: parsed.processedWebhookEvents || [],
  };
}

async function writeDb(db: PaywallDb): Promise<void> {
  const tmpPath = `${DB_PATH}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmpPath, DB_PATH);
}

async function withWrite<T>(fn: (db: PaywallDb) => T | Promise<T>): Promise<T> {
  const task = writeQueue.then(async () => {
    const db = await readDb();
    const result = await fn(db);
    await writeDb(db);
    return result;
  });

  writeQueue = task.catch(() => undefined);
  return task;
}

function eventRecord(
  type: string,
  readingRequestId: string | null,
  orderId: string | null,
  payload: Record<string, unknown>
): EventRecord {
  return {
    id: randomUUID(),
    type,
    readingRequestId,
    orderId,
    payload,
    createdAt: nowIso(),
  };
}

function normalizeInputForHash(input: ReadingInput): string {
  return JSON.stringify({
    personA: {
      name: input.personA.name.toLowerCase(),
      birthday: input.personA.birthday,
      birthtime: input.personA.birthtime,
      birthtimeUnknown: input.personA.birthtimeUnknown,
      gender: input.personA.gender,
      birthplace: input.personA.birthplace.toLowerCase(),
    },
    personB: {
      name: input.personB.name.toLowerCase(),
      birthday: input.personB.birthday,
      birthtime: input.personB.birthtime,
      birthtimeUnknown: input.personB.birthtimeUnknown,
      gender: input.personB.gender,
      birthplace: input.personB.birthplace.toLowerCase(),
    },
  });
}

export function buildCheckoutIdempotencyKey(
  input: ReadingInput,
  amountCents: number,
  currency: string
): string {
  return createHash("sha256")
    .update(`${normalizeInputForHash(input)}|${amountCents}|${currency}`)
    .digest("hex");
}

export async function createPreviewRequest(input: ReadingInput): Promise<ReadingRequestRecord> {
  return withWrite((db) => {
    const ts = nowIso();
    const reading: ReadingRequestRecord = {
      id: randomUUID(),
      mode: "preview",
      personA: input.personA,
      personB: input.personB,
      previewResult: generatePreviewReading(input),
      fullResult: null,
      createdAt: ts,
      updatedAt: ts,
    };

    db.readingRequests.push(reading);
    db.events.push(
      eventRecord("preview.requested", reading.id, null, {
        mode: "preview",
      })
    );
    return reading;
  });
}

export async function getReadingById(readingId: string): Promise<ReadingRequestRecord | null> {
  const db = await readDb();
  return db.readingRequests.find((item) => item.id === readingId) || null;
}

export async function getOrderByReadingId(readingId: string): Promise<OrderRecord | null> {
  const db = await readDb();
  return db.orders.find((item) => item.readingRequestId === readingId) || null;
}

export async function getReadingWithOrder(readingId: string): Promise<{
  reading: ReadingRequestRecord | null;
  order: OrderRecord | null;
}> {
  const db = await readDb();
  const reading = db.readingRequests.find((item) => item.id === readingId) || null;
  const order = db.orders.find((item) => item.readingRequestId === readingId) || null;
  return { reading, order };
}

export async function createOrReuseFullOrder(input: {
  readingInput: ReadingInput;
  idempotencyKey: string;
  amountCents: number;
  currency: string;
}): Promise<{
  reading: ReadingRequestRecord;
  order: OrderRecord;
  reused: boolean;
}> {
  return withWrite((db) => {
    const existingOrder = db.orders.find(
      (item) => item.idempotencyKey === input.idempotencyKey
    );

    if (existingOrder) {
      const existingReading = db.readingRequests.find(
        (item) => item.id === existingOrder.readingRequestId
      );

      if (!existingReading) {
        throw new Error("Order exists without reading request");
      }

      db.events.push(
        eventRecord("checkout.reused", existingReading.id, existingOrder.id, {
          idempotencyKey: input.idempotencyKey,
          orderStatus: existingOrder.status,
        })
      );

      return { reading: existingReading, order: existingOrder, reused: true };
    }

    const ts = nowIso();
    const reading: ReadingRequestRecord = {
      id: randomUUID(),
      mode: "full",
      personA: input.readingInput.personA,
      personB: input.readingInput.personB,
      previewResult: generatePreviewReading(input.readingInput),
      fullResult: null,
      createdAt: ts,
      updatedAt: ts,
    };

    const order: OrderRecord = {
      id: randomUUID(),
      readingRequestId: reading.id,
      stripeSessionId: null,
      stripePaymentIntentId: null,
      status: "pending",
      idempotencyKey: input.idempotencyKey,
      amountCents: input.amountCents,
      currency: input.currency,
      createdAt: ts,
      updatedAt: ts,
    };

    db.readingRequests.push(reading);
    db.orders.push(order);
    db.events.push(
      eventRecord("checkout.requested", reading.id, order.id, {
        idempotencyKey: order.idempotencyKey,
        amountCents: order.amountCents,
        currency: order.currency,
      })
    );

    return { reading, order, reused: false };
  });
}

export async function createOrReuseOrderForExistingReading(input: {
  readingId: string;
  amountCents: number;
  currency: string;
}): Promise<{
  reading: ReadingRequestRecord;
  order: OrderRecord;
  reused: boolean;
}> {
  return withWrite((db) => {
    const reading = db.readingRequests.find((item) => item.id === input.readingId);
    if (!reading) {
      throw new Error("Reading request not found");
    }

    const idempotencyKey = createHash("sha256")
      .update(`${reading.id}|${input.amountCents}|${input.currency}`)
      .digest("hex");

    const existingOrder = db.orders.find(
      (item) => item.readingRequestId === reading.id && item.idempotencyKey === idempotencyKey
    );

    if (existingOrder) {
      db.events.push(
        eventRecord("checkout.reused", reading.id, existingOrder.id, {
          idempotencyKey: existingOrder.idempotencyKey,
          fromReadingId: true,
        })
      );
      return { reading, order: existingOrder, reused: true };
    }

    const ts = nowIso();
    const order: OrderRecord = {
      id: randomUUID(),
      readingRequestId: reading.id,
      stripeSessionId: null,
      stripePaymentIntentId: null,
      status: reading.fullResult ? "paid" : "pending",
      idempotencyKey,
      amountCents: input.amountCents,
      currency: input.currency,
      createdAt: ts,
      updatedAt: ts,
    };

    db.orders.push(order);
    db.events.push(
      eventRecord("checkout.requested", reading.id, order.id, {
        idempotencyKey: order.idempotencyKey,
        fromReadingId: true,
      })
    );

    return { reading, order, reused: false };
  });
}

export async function attachStripeSessionToOrder(input: {
  orderId: string;
  stripeSessionId: string;
}): Promise<void> {
  await withWrite((db) => {
    const order = db.orders.find((item) => item.id === input.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    order.stripeSessionId = order.stripeSessionId || input.stripeSessionId;
    order.updatedAt = nowIso();
    db.events.push(
      eventRecord("checkout.session.created", order.readingRequestId, order.id, {
        stripeSessionId: order.stripeSessionId,
      })
    );
  });
}

export async function markOrderPaidFromSession(input: {
  webhookEventId: string;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
}): Promise<{ alreadyProcessed: boolean; updated: boolean }> {
  return withWrite((db) => {
    if (db.processedWebhookEvents.includes(input.webhookEventId)) {
      return { alreadyProcessed: true, updated: false };
    }

    db.processedWebhookEvents.push(input.webhookEventId);

    const order = db.orders.find((item) => item.stripeSessionId === input.stripeSessionId);
    if (!order) {
      db.events.push(
        eventRecord("webhook.session.not_found", null, null, {
          stripeSessionId: input.stripeSessionId,
          webhookEventId: input.webhookEventId,
        })
      );
      return { alreadyProcessed: false, updated: false };
    }

    const reading = db.readingRequests.find((item) => item.id === order.readingRequestId);
    if (!reading) {
      throw new Error("Order exists without reading request");
    }

    order.status = "paid";
    order.stripePaymentIntentId = input.stripePaymentIntentId;
    order.updatedAt = nowIso();

    if (!reading.fullResult) {
      reading.fullResult = generateFullReading({
        personA: reading.personA,
        personB: reading.personB,
      });
    }

    reading.mode = "full";
    reading.updatedAt = nowIso();

    db.events.push(
      eventRecord("webhook.checkout.completed", reading.id, order.id, {
        stripeSessionId: input.stripeSessionId,
        webhookEventId: input.webhookEventId,
      })
    );

    return { alreadyProcessed: false, updated: true };
  });
}

export async function recordEvent(input: {
  type: string;
  readingRequestId?: string | null;
  orderId?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await withWrite((db) => {
    db.events.push(
      eventRecord(
        input.type,
        input.readingRequestId ?? null,
        input.orderId ?? null,
        input.payload || {}
      )
    );
  });
}
