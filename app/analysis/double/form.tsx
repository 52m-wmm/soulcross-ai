"use client";

import { useState, type FormEvent } from "react";

type Gender = "male" | "female" | "other";
export type Lang = "en" | "zh";

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
    name: "Name",
    namePh: "Enter name",
    birthday: "Date of Birth",
    birthtime: "Time of Birth",
    timeUnknown: "Unknown",
    gender: "Gender",
    male: "Male",
    female: "Female",
    other: "Other",
    birthplace: "Place of Birth",
    placePh: "City, Country",
    submit: "Start Relationship Reading",
    loading: "Analyzing...",
    error: "Analysis failed. Please try again later.",
    intro: "Here is your relationship reading:",
  },
  zh: {
    person: "人物",
    name: "姓名",
    namePh: "请输入姓名",
    birthday: "出生日期",
    birthtime: "出生时间",
    timeUnknown: "未知",
    gender: "性别",
    male: "男",
    female: "女",
    other: "其他",
    birthplace: "出生地",
    placePh: "城市, 国家",
    submit: "提交分析",
    loading: "分析中...",
    error: "调用 API 出错，请检查网络或稍后重试。",
    intro: "以下是你们的关系分析：",
  },
};

export default function DoubleForm({ lang }: { lang: Lang }) {
  const [personA, setPersonA] = useState<PersonForm>({ ...emptyPerson });
  const [personB, setPersonB] = useState<PersonForm>({ ...emptyPerson });
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = <K extends keyof PersonForm>(
    person: "A" | "B",
    field: K,
    value: PersonForm[K]
  ) => {
    const setter = person === "A" ? setPersonA : setPersonB;
    setter((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "double",
          lang,
          data: { personA, personB },
        }),
      });

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const json = await res.json();
      setResult(json.text ?? json.result ?? "");
    } catch (error) {
      console.error(error);
      setResult(TEXT[lang].error);
    } finally {
      setLoading(false);
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
          required
        />

        <input
          type="date"
          value={data.birthday}
          onChange={(e) => handleChange(person, "birthday", e.target.value)}
          className="px-5 py-4 rounded-2xl text-xl text-white bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
          required
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
          required
        />
      </div>
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-7xl mx-auto px-6"
    >
      {renderPersonForm("A")}
      {renderPersonForm("B")}

      <div className="md:col-span-2 flex justify-center mt-6">
        <button
          type="submit"
          disabled={loading}
          className="px-16 py-6 bg-purple-700 hover:bg-purple-600 active:bg-purple-800 text-white rounded-3xl text-3xl font-bold shadow-2xl transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? TEXT[lang].loading : TEXT[lang].submit}
        </button>
      </div>

      {result && (
        <div className="md:col-span-2 bg-gray-800/60 backdrop-blur-lg border border-gray-700 rounded-3xl p-8 shadow-2xl text-white text-2xl whitespace-pre-line mt-6">
          <p className="mb-4 text-white/60 italic">
            {TEXT[lang].intro}
          </p>
          {result}
        </div>
      )}
    </form>
  );
}
