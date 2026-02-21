"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Lang = "en" | "zh";

const TEXT = {
  en: {
    title: "SoulCross",
    desc: `Discover your personality, life rhythm,
and the direction that guides your journey.`,
    start: "Start Reading",
    switch: "中文",
  },
  zh: {
    title: "SoulCross",
    desc: `探索你的八字与命运，
发现人生的神秘力量与前进方向。`,
    start: "开始分析",
    switch: "EN",
  },
};

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* 背景图 */}
      <Image
        src="/bg.jpg"
        alt="SoulCross background"
        fill
        priority
        className="object-cover"
      />

      {/* 半透明遮罩 */}
      <div className="absolute inset-0 bg-black/60" />

      {/* 语言切换（极简，不影响设计） */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={() => setLang(lang === "en" ? "zh" : "en")}
          className="text-sm text-white/80 hover:text-white transition"
        >
          {TEXT[lang].switch}
        </button>
      </div>

      {/* 内容区域 */}
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 drop-shadow-lg">
          {TEXT[lang].title}
        </h1>

        <p className="text-lg md:text-2xl text-white/80 mb-10 max-w-2xl whitespace-pre-line">
          {TEXT[lang].desc}
        </p>

        <Link
          href={`/analysis?lang=${lang}`}
          className="inline-flex items-center justify-center px-10 py-4 rounded-3xl
                     text-xl md:text-2xl font-bold text-white
                     bg-yellow-600 hover:bg-blue-700 active:bg-purple-800
                     shadow-xl transition-transform hover:-translate-y-0.5"
        >
          {TEXT[lang].start}
        </Link>
      </section>
    </main>
  );
}
