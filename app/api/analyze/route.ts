import { NextResponse } from "next/server";

type Mode = "single" | "double";
type Lang = "en" | "zh";

const ENDING = {
  single: {
    en: "You don’t need to become someone else to move forward.\nUnderstanding yourself more deeply is already a form of progress.",
    zh: "你不需要成为别人，才能向前。\n更理解自己，本身就是一种成长。",
  },
  double: {
    en: "This connection is not about who is right or wrong.\nIt’s about learning how two different rhythms can move together.",
    zh: "你们的问题，不是谁对谁错，\n而是节奏与表达方式的不同。",
  },
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mode: Mode | undefined = body.mode;
    const lang: Lang = body.lang === "en" ? "en" : "zh";
    const data = body.data;

    if (!mode || !data) {
      return NextResponse.json({ error: "Missing mode or data" }, { status: 400 });
    }

    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

    if (!DEEPSEEK_API_KEY) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    /* ---------- system prompt ---------- */

    const systemPrompt =
      lang === "en"
        ? `
You are a thoughtful, emotionally intelligent life-reading assistant.

You do NOT explain astrology, metaphysics, or any technical system.
You do NOT mention destiny, fate, charts, elements, or calculations.

Your role is to translate birth information into a human-centered narrative about:
- mbti
- personality tendencies
- emotional patterns
- life rhythm
- career orientation
- relationship dynamics

Your tone must be:
- warm and respectful
- specific but not absolute
- never fatalistic
- never judgmental

Write directly to the person.
`
        : `
你是一位温和、理性、富有洞察力的人生分析助手。

你不解释任何命理、玄学或技术体系，
不提及八字、五行、命格、推算等概念。

你的任务是基于出生信息，
给出关于【mbti、性格倾向、情绪模式、人生节奏与关系互动】的理解性分析。

语气应当：
- 温柔而具体
- 避免绝对化与恐吓
- 像一位成熟的顾问，而非算命师.
`;

    /* ---------- user prompt ---------- */

    let userPrompt = "";

    if (mode === "single") {
      const { name, gender, birthDate, birthTime, birthPlace, timeUnknown } = data;

      userPrompt =
        lang === "en"
          ? `
Based on the following information, provide a personalized life reading.
Information:
Name: ${name || "Unknown"}
Gender: ${gender || "Unknown"}
Birth Date: ${birthDate || "Unknown"}
Birth Time: ${timeUnknown ? "Unknown" : birthTime || "Unknown"}
Birth Place: ${birthPlace || "Unknown"}

Please structure the response into the following sections:

1. Personality Overview
2. Emotional & Mental Patterns
3. Career & Life Direction
4. Relationships & Connection
5. Life Rhythm & Growth
6. A Gentle Reminder

Avoid technical terms.
Write in clear, natural English.
`
          : `
请根据以下信息，提供一份个性化的人生分析。

信息如下：
姓名：${name || "未知"}
性别：${gender || "未知"}
出生日期：${birthDate || "未知"}
出生时间：${timeUnknown ? "未知" : birthTime || "未知"}
出生地：${birthPlace || "未知"}

请按以下结构输出内容：

1. mbti 性格与内在动力
2. 情绪与心理模式
3. 事业与人生方向
4. 关系与相处模式
5. 人生节奏与成长
6. 温柔的提醒

请避免任何命理或专业术语，语言自然、真诚。
`;
    } else {
      const { personA, personB } = data;

      userPrompt =
        lang === "en"
          ? `
Provide a relationship reading for two people.

This reading is not about compatibility scores or destiny.
It is about understanding how two individuals naturally interact.

Person A: ${personA?.name || "Unknown"}
Person B: ${personB?.name || "Unknown"}

Please structure the response into the following sections:

1. The Core Dynamic,why attracted or repelled
2. Natural Strengths Together
3. Where Tension May Arise
4. How to Get Along Better (3–5 practical suggestions)
5. A Message for Each Person

Use natural, empathetic English.
Avoid metaphysical or technical language.
`
          : `
请为以下两个人提供一份关系分析。

这不是合不合、对不对的问题，
而是帮助他们理解彼此是“如何互动的”。

人物 A：${personA?.name || "未知"}
人物 B：${personB?.name || "未知"}

请按以下结构输出内容：

1. 关系的整体互动模式,为何会互相吸引或讨厌
2. 相处中的优势
3. 容易卡住的地方
4. 更好的相处方式（3–5 条具体建议）
5. 分别给双方的一段话（各一段）

请避免任何命理或宿命论表达，
像一位成熟的关系顾问在说话。
`;
    }

    const resp = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt.trim() },
          { role: "user", content: userPrompt.trim() },
        ],
      }),
    });

    const json = await resp.json();

    const rawText = json?.choices?.[0]?.message?.content || "No response";

    const ending =
      mode === "single"
        ? lang === "en"
          ? ENDING.single.en
          : ENDING.single.zh
        : lang === "en"
        ? ENDING.double.en
        : ENDING.double.zh;

    return NextResponse.json({
      text: `${rawText}\n\n${ending}`,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
