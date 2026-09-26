// app/api/client/ai/word-meaning/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import {
  groq,
  GROQ_MODEL,
  getGroqConfig,
  getSystemPrompt,
} from "@/config/groq.config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   IN-MEMORY CACHE
   Word meanings rarely change → 24h TTL is safe.
========================================================= */
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(word: string, fullLine: string): string {
  const w = word.trim().toLowerCase();
  const l = (fullLine || "").trim().toLowerCase();
  return `word:${w}:${l}`;
}

export function clearWordCache(word?: string) {
  if (!word) {
    cache.clear();
    return;
  }
  const prefix = `word:${word.trim().toLowerCase()}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/* =========================================================
   POST — get meaning of a single word
========================================================= */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { word, fullLine, line } = body as {
      word?: string;
      fullLine?: string;
      line?: string;
    };

    if (!word || !word.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Word is required",
          data: null,
          err: "WORD_REQUIRED",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const cleanWord = word.trim();
    const contextLine = (fullLine || line || "").trim();

    /* ---------- CACHE ---------- */
    const cacheKey = getCacheKey(cleanWord, contextLine);
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(
        {
          success: true,
          message: "Meaning fetched (cached)",
          data: cached.data,
          err: null,
          status: HTTP_STATUS.OK,
        },
        {
          status: HTTP_STATUS.OK,
          headers: {
            "X-Cache": "HIT",
            "X-Cache-TTL": `${Math.floor(
              (CACHE_TTL - (Date.now() - cached.timestamp)) / 1000
            )}s`,
          },
        }
      );
    }

    /* ---------- BUILD PROMPT ---------- */
    const systemPrompt = `You are an expert Urdu lexicographer and literary critic.
Given a single Urdu word from a shair (couplet), explain its meaning clearly.

Return ONLY a JSON object with this exact shape:
{
  "urdu": "The word written correctly in Urdu script",
  "pronunciation": "roman transliteration",
  "meaningUrdu": "short Urdu meaning, 1-2 lines max",
  "meaningEnglish": "short English meaning, 1-2 lines max",
  "inContext": "how it's used in this specific line, 1-2 lines, in Urdu + English mix"
}

Rules:
- Be concise and clear.
- Do NOT add markdown, code fences, or extra text outside the JSON.
- Only return valid JSON that can be parsed directly.`;

    const userPrompt = `WORD: ${cleanWord}
${contextLine ? `FULL LINE: ${contextLine}` : ""}

Provide the JSON response now.`;

    const config = getGroqConfig("translation");

    /* ---------- GROQ ---------- */
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: GROQ_MODEL,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      top_p: config.top_p,
      frequency_penalty: config.frequency_penalty,
      presence_penalty: config.presence_penalty,
    });

    const rawAnswer = completion.choices[0]?.message?.content || "";

    /* ---------- PARSE JSON ---------- */
    let parsed: {
      urdu: string;
      pronunciation: string;
      meaningUrdu: string;
      meaningEnglish: string;
      inContext: string;
    } | null = null;

    try {
      // Strip code fences if the model added them
      const cleaned = rawAnswer
        .replace(/```json\s*/gi, "")
        .replace(/```/g, "")
        .trim();

      // Extract the first JSON object
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      }
    } catch {
      parsed = null;
    }

    const data =
      parsed && parsed.meaningUrdu
        ? parsed
        : {
            urdu: cleanWord,
            pronunciation: "",
            meaningUrdu: "معنی دستیاب نہیں",
            meaningEnglish: "Meaning could not be generated.",
            inContext: "",
          };

    /* ---------- CACHE + RESPOND ---------- */
    cache.set(cacheKey, { data, timestamp: Date.now() });

    return NextResponse.json(
      {
        success: true,
        message: "Meaning fetched successfully",
        data,
        err: null,
        status: HTTP_STATUS.OK,
      },
      {
        status: HTTP_STATUS.OK,
        headers: { "X-Cache": "MISS" },
      }
    );
  } catch (error: any) {
    console.error("Word Meaning Error:", error);

    const status = error?.status ?? error?.response?.status;
    const isModelIssue = status === 404;

    return NextResponse.json(
      {
        success: false,
        message: isModelIssue
          ? "AI model unavailable right now"
          : "Could not fetch meaning",
        data: null,
        err: isModelIssue ? "MODEL_UNAVAILABLE" : "AI_ERROR",
        status: isModelIssue
          ? HTTP_STATUS.SERVICE_UNAVAILABLE
          : HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      {
        status: isModelIssue
          ? HTTP_STATUS.SERVICE_UNAVAILABLE
          : HTTP_STATUS.INTERNAL_SERVER_ERROR,
      }
    );
  }
}

/* =========================================================
   GET — 405 helper
========================================================= */
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: "Use POST to fetch a word meaning",
      data: null,
      err: "METHOD_NOT_ALLOWED",
      status: 405,
    },
    { status: 405 }
  );
}