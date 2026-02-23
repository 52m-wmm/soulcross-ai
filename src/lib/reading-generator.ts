import type {
  ReadingFullResult,
  ReadingInput,
  ReadingPreviewResult,
} from "./paywall-types";

export function generatePreviewReading(input: ReadingInput): ReadingPreviewResult {
  const a = input.personA.name || "Person A";
  const b = input.personB.name || "Person B";

  return {
    title: `${a} & ${b}: Relationship Preview`,
    summary:
      `${a} and ${b} show a strong pull between emotional expression and practical stability. ` +
      "The connection has real momentum, but timing and communication style need alignment.",
    highlights: [
      "Natural attraction forms quickly when both feel heard.",
      "Most friction comes from different pace, not lack of care.",
    ],
    upgradeHint:
      "Unlock the full reading to see detailed strengths, tension triggers, and a practical plan.",
  };
}

export function generateFullReading(input: ReadingInput): ReadingFullResult {
  const a = input.personA.name || "Person A";
  const b = input.personB.name || "Person B";

  return {
    title: `${a} & ${b}: Full Relationship Reading`,
    overview:
      `${a} tends to process feelings through reflection, while ${b} often seeks quick clarity. ` +
      "This pairing can be deeply supportive when both sides define expectations early.",
    strengths: [
      "Strong potential for mutual growth through honest feedback.",
      "Complementary emotional and practical instincts.",
      "High resilience when conflicts are addressed early.",
    ],
    tensions: [
      "Misread silence as rejection during stress cycles.",
      "Different conflict styles can escalate small issues.",
      "Overgiving without boundaries leads to burnout.",
    ],
    guidance: [
      "Set a weekly 20-minute check-in with one clear agenda.",
      "Name the issue before discussing solutions.",
      "Use time-boxed pauses during heated conversations.",
      "Define one non-negotiable and one compromise from each side.",
      "Track wins to prevent a negativity-only pattern.",
    ],
    finalMessage:
      "This relationship works best when clarity is treated as care, not criticism. Progress comes from consistency.",
  };
}
