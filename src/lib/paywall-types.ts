export type Gender = "male" | "female" | "other";

export interface PersonInput {
  name: string;
  birthday: string;
  birthtime: string;
  birthtimeUnknown: boolean;
  gender: Gender;
  birthplace: string;
}

export interface ReadingInput {
  personA: PersonInput;
  personB: PersonInput;
}

export type ReadingMode = "preview" | "full";

export interface ReadingPreviewResult {
  title: string;
  summary: string;
  highlights: string[];
  upgradeHint: string;
}

export interface ReadingFullResult {
  title: string;
  overview: string;
  strengths: string[];
  tensions: string[];
  guidance: string[];
  finalMessage: string;
}

export interface ReadingRequestRecord {
  id: string;
  mode: ReadingMode;
  personA: PersonInput;
  personB: PersonInput;
  previewResult: ReadingPreviewResult | null;
  fullResult: ReadingFullResult | null;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = "pending" | "paid";

export interface OrderRecord {
  id: string;
  readingRequestId: string;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  status: OrderStatus;
  idempotencyKey: string;
  amountCents: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventRecord {
  id: string;
  type: string;
  readingRequestId: string | null;
  orderId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface PaywallDb {
  readingRequests: ReadingRequestRecord[];
  orders: OrderRecord[];
  events: EventRecord[];
  processedWebhookEvents: string[];
}
