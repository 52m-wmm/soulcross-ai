import type { PersonInput, ReadingInput } from "./paywall-types";

function sanitizePerson(person: Partial<PersonInput> | undefined): PersonInput {
  return {
    name: (person?.name || "").trim(),
    birthday: (person?.birthday || "").trim(),
    birthtime: (person?.birthtime || "").trim(),
    birthtimeUnknown: Boolean(person?.birthtimeUnknown),
    gender:
      person?.gender === "female" || person?.gender === "other"
        ? person.gender
        : "male",
    birthplace: (person?.birthplace || "").trim(),
  };
}

export function validateReadingInput(raw: unknown): ReadingInput {
  const payload = (raw || {}) as {
    personA?: Partial<PersonInput>;
    personB?: Partial<PersonInput>;
  };

  const personA = sanitizePerson(payload.personA);
  const personB = sanitizePerson(payload.personB);

  if (!personA.name || !personA.birthday || !personB.name || !personB.birthday) {
    throw new Error(
      "Missing required fields: personA.name, personA.birthday, personB.name, personB.birthday"
    );
  }

  return { personA, personB };
}
