"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";

type Gender = "male" | "female" | "other";
export type Lang = "en" | "zh";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

interface PersonForm {
  name: string;
  birthday: string;
  birthtime: string;
  birthtimeUnknown: boolean;
  gender: Gender;
  birthplace: string;
}

const emptyPerson: PersonForm = {
  name: "",
  birthday: "",
  birthtime: "",
  birthtimeUnknown: false,
  gender: "male",
  birthplace: "",
};

const TEXT = {
  en: {
    person: "Person",
    namePh: "Enter name",
    timeUnknown: "Unknown",
    male: "Male",
    female: "Female",
    other: "Other",
    placePh: "City, Country",
    previewCta: "Start Free Preview",
    fullCta: "Unlock Full Reading ($9.99)",
    loadingPreview: "Generating Preview...",
    loadingCheckout: "Redirecting to Payment...",
    error: "Request failed. Please try again later.",
    requiredError:
      "Please complete Person A/B name and date of birth before continuing.",
    helper: "Preview is free. Full report requires payment.",
  },
  zh: {
    person: "人物",
    namePh: "请输入姓名",
    timeUnknown: "未知",
    male: "男",
    female: "女",
    other: "其他",
    placePh: "城市, 国家",
    previewCta: "Start Free Preview",
    fullCta: "Unlock Full Reading ($9.99)",
    loadingPreview: "正在生成预览...",
    loadingCheckout: "正在跳转支付...",
    error: "请求失败，请稍后重试。",
    requiredError: "请至少填写 Person A/B 的姓名和出生日期。",
    helper: "Preview is free. Full report requires payment.",
  },
};

export default function DoubleForm({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [personA, setPersonA] = useState<PersonForm>({ ...emptyPerson });
  const [personB, setPersonB] = useState<PersonForm>({ ...emptyPerson });
  const [message, setMessage] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<"preview" | "checkout" | null>(null);

  const handleChange = <K extends keyof PersonForm>(
    person: "A" | "B",
    field: K,
    value: PersonForm[K]
  ) => {
    const setter = person === "A" ? setPersonA : setPersonB;
    setter((prev) => ({ ...prev, [field]: value }));
  };

  const payload = { personA, personB };

  const hasRequiredFields = () => {
    return Boolean(
      personA.name.trim() &&
        personA.birthday.trim() &&
        personB.name.trim() &&
        personB.birthday.trim()
    );
  };

  const ensureMinimumFields = () => {
    if (!hasRequiredFields()) {
      setMessage(TEXT[lang].requiredError);
      return false;
    }
    return true;
  };

  const handlePreview = async () => {
    if (!ensureMinimumFields()) return;

    setLoadingAction("preview");
    setMessage(null);

    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payload }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || `Preview failed: ${res.status}`);
      }

      router.push(`/reading/${json.readingId}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : TEXT[lang].error);
      setLoadingAction(null);
    }
  };

  const handleCheckout = async () => {
    if (!ensureMinimumFields()) return;

    setLoadingAction("checkout");
    setMessage(null);

    try {
      if (!stripePromise) {
        throw new Error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in client env");
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payload }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || `Checkout failed: ${res.status}`);
      }

      if (json?.alreadyPaid && json?.readingId) {
        router.push(`/reading/${json.readingId}`);
        router.refresh();
        return;
      }

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe failed to load");
      }

      const checkoutResult = await stripe.redirectToCheckout({ sessionId: json.sessionId });
      if (checkoutResult?.error?.message) {
        throw new Error(checkoutResult.error.message);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : TEXT[lang].error);
      setLoadingAction(null);
    }
  };

  const renderPersonForm = (person: "A" | "B") => {
    const data = person === "A" ? personA : personB;

    return (
      <div className="flex flex-col gap-6 bg-gray-800/60 backdrop-blur-lg border border-gray-700 rounded-3xl p-8 shadow-2xl w-full">
        <h3 className="text-3xl font-bold text-white text-center mb-4">
          {TEXT[lang].person} {person}
        </h3>

        <input
          type="text"
          placeholder={TEXT[lang].namePh}
          value={data.name}
          onChange={(e) => handleChange(person, "name", e.target.value)}
          className="px-5 py-4 rounded-2xl text-xl text-white placeholder-gray-400 bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
        />

        <input
          type="date"
          value={data.birthday}
          onChange={(e) => handleChange(person, "birthday", e.target.value)}
          className="px-5 py-4 rounded-2xl text-xl text-white bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
        />

        <div className="flex gap-4 items-center">
          <input
            type="time"
            value={data.birthtime}
            onChange={(e) => handleChange(person, "birthtime", e.target.value)}
            disabled={data.birthtimeUnknown}
            className="flex-1 px-5 py-4 rounded-2xl text-xl text-white bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner disabled:opacity-60"
          />
          <label className="flex items-center gap-2 text-white text-lg">
            <input
              type="checkbox"
              checked={data.birthtimeUnknown}
              onChange={(e) =>
                handleChange(person, "birthtimeUnknown", e.target.checked)
              }
              className="w-5 h-5 text-purple-500 border-gray-600 rounded"
            />
            {TEXT[lang].timeUnknown}
          </label>
        </div>

        <select
          value={data.gender}
          onChange={(e) =>
            handleChange(person, "gender", e.target.value as Gender)
          }
          className="px-5 py-4 rounded-2xl text-xl text-white bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
        >
          <option value="male">{TEXT[lang].male}</option>
          <option value="female">{TEXT[lang].female}</option>
          <option value="other">{TEXT[lang].other}</option>
        </select>

        <input
          type="text"
          placeholder={TEXT[lang].placePh}
          value={data.birthplace}
          onChange={(e) => handleChange(person, "birthplace", e.target.value)}
          className="px-5 py-4 rounded-2xl text-xl text-white placeholder-gray-400 bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
        />
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-7xl mx-auto px-6">
      {renderPersonForm("A")}
      {renderPersonForm("B")}

      <div className="md:col-span-2 flex justify-center mt-6">
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-6">
            <button
              type="button"
              onClick={handlePreview}
              disabled={Boolean(loadingAction)}
              className="px-10 py-5 bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-white rounded-3xl text-xl font-semibold shadow-2xl transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingAction === "preview"
                ? TEXT[lang].loadingPreview
                : TEXT[lang].previewCta}
            </button>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={Boolean(loadingAction)}
              className="px-10 py-5 bg-green-600 hover:bg-green-500 active:bg-green-700 text-white rounded-3xl text-xl font-bold shadow-2xl transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingAction === "checkout"
                ? TEXT[lang].loadingCheckout
                : TEXT[lang].fullCta}
            </button>
          </div>

          <p className="text-sm text-gray-300">{TEXT[lang].helper}</p>

          {message && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200 text-sm max-w-2xl text-center">
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
