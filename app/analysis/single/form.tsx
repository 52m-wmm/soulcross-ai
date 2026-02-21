"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import DatePicker from "react-datepicker";

type Gender = "male" | "female" | "other";
type Lang = "en" | "zh";

interface SingleFormValues {
  name: string;
  gender: Gender;
  birthDate: Date | null;
  birthTime: Date | null;
  birthPlace: string;
  timeUnknown: boolean;
}

const TEXT = {
  en: {
    title: "Single Reading",
    name: "Name",
    namePh: "Enter your name",
    gender: "Gender",
    male: "Male",
    female: "Female",
    other: "Other",
    birthDate: "Date of Birth",
    birthTime: "Time of Birth",
    birthPlace: "Place of Birth",
    placePh: "City, Country",
    timeUnknown: "Time unknown (use general analysis)",
    submit: "Start Reading",
    loading: "Analyzing...",
    error: "Analysis failed. Please try again later.",
    intro: "Here is your personalized reading:",
  },
  zh: {
    title: "单人分析",
    name: "姓名",
    namePh: "请输入姓名",
    gender: "性别",
    male: "男",
    female: "女",
    other: "其他",
    birthDate: "出生日期",
    birthTime: "出生时间",
    birthPlace: "出生地",
    placePh: "城市, 国家",
    timeUnknown: "时辰不详（将使用宏观分析）",
    submit: "提交分析",
    loading: "分析中...",
    error: "分析失败，请稍后重试。",
    intro: "以下是你的个性与人生分析：",
  },
};

export default function SingleForm({ lang }: { lang: Lang }) {
  const { register, handleSubmit, control, watch, setValue } =
    useForm<SingleFormValues>({
      defaultValues: {
        name: "",
        gender: "male",
        birthDate: null,
        birthTime: null,
        birthPlace: "",
        timeUnknown: false,
      },
    });

  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const timeUnknown = watch("timeUnknown");

  useEffect(() => {
    if (timeUnknown) {
      setValue("birthTime", null);
    }
  }, [timeUnknown, setValue]);

  const onSubmit = async (data: SingleFormValues) => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "single",
          lang,
          data,
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

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-gray-800/60 backdrop-blur-lg p-10 rounded-2xl shadow-lg max-w-4xl mx-auto"
      >
        <h2 className="text-4xl font-bold mb-8 text-white text-center">
          {TEXT[lang].title}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div className="flex flex-col">
            <label className="mb-2 font-medium text-white text-xl">
              {TEXT[lang].name}
            </label>
            <input
              {...register("name", { required: true })}
              placeholder={TEXT[lang].namePh}
              className="p-4 rounded-xl border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full text-white placeholder-gray-300 text-lg bg-gray-700"
            />
          </div>

          {/* Gender */}
          <div className="flex flex-col">
            <label className="mb-2 font-medium text-white text-xl">
              {TEXT[lang].gender}
            </label>
            <select
              {...register("gender")}
              className="p-4 rounded-xl border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full text-white text-lg bg-gray-700"
            >
              <option value="male">{TEXT[lang].male}</option>
              <option value="female">{TEXT[lang].female}</option>
              <option value="other">{TEXT[lang].other}</option>
            </select>
          </div>

          {/* Birth Date */}
          <div className="flex flex-col">
            <label className="mb-2 font-medium text-white text-xl">
              {TEXT[lang].birthDate}
            </label>
            <Controller
              control={control}
              name="birthDate"
              rules={{ required: true }}
              render={({ field }) => (
                <DatePicker
                  selected={field.value}
                  onChange={field.onChange}
                  dateFormat="yyyy-MM-dd"
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                  scrollableYearDropdown
                  yearDropdownItemNumber={120}
                  minDate={new Date(1900, 0, 1)}
                  maxDate={new Date()}
                  popperClassName="z-50"
                  className="p-4 rounded-xl border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full text-white text-xl bg-gray-700"
                />
              )}
            />
          </div>

          {/* Birth Time */}
          <div className="flex flex-col">
            <label className="mb-2 font-medium text-white text-xl">
              {TEXT[lang].birthTime}
            </label>
            <Controller
              control={control}
              name="birthTime"
              render={({ field }) => (
                <DatePicker
                  selected={field.value}
                  onChange={field.onChange}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={30}
                  dateFormat="HH:mm"
                  disabled={timeUnknown}
                  popperClassName="z-50"
                  className={`p-4 rounded-xl border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-white text-lg bg-gray-700 ${
                    timeUnknown ? "cursor-not-allowed opacity-60" : ""
                  }`}
                />
              )}
            />
          </div>

          {/* Birth Place */}
          <div className="flex flex-col md:col-span-2">
            <label className="mb-2 font-medium text-white text-xl">
              {TEXT[lang].birthPlace}
            </label>
            <input
              {...register("birthPlace", { required: true })}
              placeholder={TEXT[lang].placePh}
              className="p-4 rounded-xl border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full text-white text-lg bg-gray-700"
            />
          </div>

          {/* Time Unknown */}
          <div className="flex items-center space-x-3 md:col-span-2">
            <input
              type="checkbox"
              {...register("timeUnknown")}
              id="timeUnknown"
              className="w-6 h-6 text-blue-500 border-gray-600 rounded"
            />
            <label
              htmlFor="timeUnknown"
              className="text-white font-medium text-xl"
            >
              {TEXT[lang].timeUnknown}
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-8 w-full bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white font-bold py-5 rounded-2xl text-2xl shadow-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? TEXT[lang].loading : TEXT[lang].submit}
        </button>
      </form>

      {result && (
        <div className="max-w-4xl mx-auto mt-6 p-8 bg-gray-800/60 backdrop-blur-lg text-white rounded-2xl shadow-2xl whitespace-pre-line text-lg md:text-xl leading-relaxed">
          <p className="mb-4 text-white/60 italic">
            {TEXT[lang].intro}
          </p>
          {result}
        </div>
      )}
    </>
  );
}
