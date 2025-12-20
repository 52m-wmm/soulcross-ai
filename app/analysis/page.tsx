"use client";

import { useState } from "react";
import SingleForm from "./single/form";
import DoubleForm from "./double/form";

type Mode = "single" | "double";
type Lang = "en" | "zh";

const TEXT = {
  en: {
    title: "SoulCross Analysis",
    desc:
      "Choose an analysis mode and enter birth details. SoulCross will reveal your personality, life rhythm, and relationship patterns.",
    single: "Single Reading",
    double: "Relationship Reading",
    switch: "中文",
  },
  zh: {
    title: "SoulCross 命盘分析",
    desc:
      "选择分析模式，输入出生信息，SoulCross 将为你解读性格、人生节奏与关系模式。",
    single: "单人分析",
    double: "双人配对",
    switch: "EN",
  },
};

export default function AnalysisPage({
  searchParams,
}: {
  searchParams?: { lang?: string };
}) {
  const initialLang: Lang =
    searchParams?.lang === "zh" ? "zh" : "en";


  const [lang, setLang] = useState<Lang>(initialLang);
  const [mode, setMode] = useState<Mode>("single");

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white flex flex-col items-center px-4 py-10">
      {/* 语言切换 */}
      <div className="absolute top-6 right-6">
        <button
          type="button"
          onClick={() => setLang(lang === "en" ? "zh" : "en")}
          className="text-sm text-gray-300 hover:text-white transition"
        >
          {TEXT[lang].switch}
        </button>
      </div>

      <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-center">
        {TEXT[lang].title}
      </h1>

      <p className="text-gray-300 mb-8 max-w-2xl text-center text-lg">
        {TEXT[lang].desc}
      </p>

      {/* 模式切换 */}
      <div className="flex mb-10 gap-4 bg-gray-800/60 p-2 rounded-full border border-gray-700">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`px-6 md:px-8 py-2 md:py-3 rounded-full text-lg md:text-xl font-semibold transition ${
            mode === "single"
              ? "bg-yellow-600 shadow-lg"
              : "text-gray-300 hover:text-white"
          }`}
        >
          {TEXT[lang].single}
        </button>

        <button
          type="button"
          onClick={() => setMode("double")}
          className={`px-6 md:px-8 py-2 md:py-3 rounded-full text-lg md:text-xl font-semibold transition ${
            mode === "double"
              ? "bg-yellow-600 shadow-lg"
              : "text-gray-300 hover:text-white"
          }`}
        >
          {TEXT[lang].double}
        </button>
      </div>

      {/* 表单区域 */}
      <div className="w-full max-w-5xl mb-16">
        {mode === "single" ? (
          <SingleForm lang={lang} />
        ) : (
          <DoubleForm lang={lang} />
        )}
      </div>
    </div>
  );
}
