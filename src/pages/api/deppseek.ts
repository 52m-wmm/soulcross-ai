// src/pages/api/deepseek.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const data = req.body;

  try {
    const response = await fetch("https://api.deepseek.com/v1/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer sk-2fe553e32663407d8c7d8a6acc293925",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error(`DeepSeek API 错误: ${response.statusText}`);

    const result = await response.json();

    res.status(200).json({ result: result.summary || "分析完成" });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ result: "分析接口请求失败" });
  }
}
