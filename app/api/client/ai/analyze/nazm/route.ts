// app/api/client/ai/analyze/nazm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import NazmModel from "@/models/kalam/nazm.model";
import {
  groq,
  GROQ_MODEL,
  getGroqConfig,
  getSystemPrompt,
} from "@/config/groq.config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000;

function getCacheKey(slug: string, question: string): string {
  return `ask-nazm:${slug}:${question.trim().toLowerCase()}`;
}

export async function POST(request: NextRequest) {
  try {
    await ConnectDB(EnvSecrets.mongoUri as string);

    const body = await request.json();
    const { slug, question } = body;

    if (!slug || !question?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Slug and question are required",
          data: null,
          err: "MISSING_FIELDS",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    /* ---------- CACHE ---------- */
    const cacheKey = getCacheKey(slug, question);
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(
        {
          success: true,
          message: "Question answered (cached)",
          data: cached.data,
          err: null,
          status: HTTP_STATUS.OK,
        },
        {
          status: HTTP_STATUS.OK,
          headers: { "X-Cache": "HIT" },
        }
      );
    }

    /* ---------- FETCH NAZM ---------- */
    const nazm: any = await NazmModel.findOne({ slug })
      .select("unwan takhallus slug content metaTitle metaDescription category")
      .lean();

    if (!nazm) {
      return NextResponse.json(
        {
          success: false,
          message: "Nazm not found",
          data: null,
          err: "NAZM_NOT_FOUND",
          status: HTTP_STATUS.NOT_FOUND,
        },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    /* ---------- BUILD CONTEXT (bands → shairs → lines) ---------- */
    let shairCount = 0;
    const bandsText = (nazm.content || [])
      .map((band: any, bandIdx: number) => {
        const shairs = (band.shairs || []).map((shair: any) => {
          shairCount++;
          return `  Shair ${shairCount}:\n    First:  "${shair.lines?.[0] ?? ""}"\n    Second: "${shair.lines?.[1] ?? ""}"`;
        });
        return `Band ${bandIdx + 1}:\n${shairs.join("\n")}`;
      })
      .join("\n\n");

    const fullContext = `
NAZM FULL CONTEXT

POET (TAKHALLUS): ${nazm.takhallus}
TITLE (UNWAN): ${nazm.unwan || "Untitled"}
DESCRIPTION: ${nazm.metaDescription || "No description"}
CATEGORIES: ${nazm.category?.join(", ") || "None"}
TOTAL BANDS: ${nazm.content?.length ?? 0}
TOTAL SHAIRS: ${shairCount}

ALL BANDS & SHAIRS:
${bandsText}

USER'S QUESTION:
"${question}"

INSTRUCTIONS:
- Answer ONLY about THIS specific nazm.
- Reference specific bands/shairs/lines.
- Respond in a mix of Urdu and English.
`;

    const config = getGroqConfig("analytical");
    const systemPrompt = getSystemPrompt("ANALYZE_NAZM");

    /* ---------- GROQ ---------- */
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: fullContext },
      ],
      model: GROQ_MODEL,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      top_p: config.top_p,
      frequency_penalty: config.frequency_penalty,
      presence_penalty: config.presence_penalty,
    });

    const answer =
      completion.choices[0]?.message?.content || "No response generated";

    const responseData = {
      question,
      answer,
      model: GROQ_MODEL,
      nazm: {
        unwan: nazm.unwan,
        takhallus: nazm.takhallus,
        slug: nazm.slug,
        totalShairs: shairCount,
      },
    };

    cache.set(cacheKey, { data: responseData, timestamp: Date.now() });

    return NextResponse.json(
      {
        success: true,
        message: "Question answered successfully",
        data: responseData,
        err: null,
        status: HTTP_STATUS.OK,
      },
      {
        status: HTTP_STATUS.OK,
        headers: { "X-Cache": "MISS" },
      }
    );
  } catch (error: any) {
    console.error("Ask Nazm Error:", error);
    const isModelIssue = (error?.status ?? error?.response?.status) === 404;
    return NextResponse.json(
      {
        success: false,
        message: isModelIssue
          ? "AI model unavailable right now"
          : "Failed to answer question",
        data: null,
        err: isModelIssue ? "MODEL_UNAVAILABLE" : "GROQ_ERROR",
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

export async function GET() {
  return NextResponse.json(
    { success: false, message: "Use POST", err: "METHOD_NOT_ALLOWED", status: 405 },
    { status: 405 }
  );
}