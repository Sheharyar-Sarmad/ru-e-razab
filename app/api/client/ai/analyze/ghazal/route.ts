// app/api/client/ai/analyze/ghazal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import GhazalModel from "@/models/kalam/ghazals.model";
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
========================================================= */
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCacheKey(slug: string, question: string): string {
  return `ask:${slug}:${question.trim().toLowerCase()}`;
}

export function clearGhazalCache(slug: string) {
  const prefix = `ask:${slug}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

export function clearAllCache() {
  cache.clear();
}

/* =========================================================
   POST
========================================================= */
export async function POST(request: NextRequest) {
  try {
    await ConnectDB(EnvSecrets.mongoUri as string);

    const body = await request.json();
    const { slug, question } = body;

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message: "Slug is required",
          data: null,
          err: "SLUG_REQUIRED",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (!question || !question.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Question is required",
          data: null,
          err: "QUESTION_REQUIRED",
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
          headers: {
            "X-Cache": "HIT",
            "X-Cache-TTL": `${Math.floor(
              (CACHE_TTL - (Date.now() - cached.timestamp)) / 1000
            )}s`,
          },
        }
      );
    }

    /* ---------- FETCH GHAZAL ---------- */
    const ghazal: any = await GhazalModel.findOne({ slug })
      .select("takhallus slug content metaTitle metaDescription category")
      .lean();

    if (!ghazal) {
      return NextResponse.json(
        {
          success: false,
          message: "Ghazal not found",
          data: null,
          err: "GHAZAL_NOT_FOUND",
          status: HTTP_STATUS.NOT_FOUND,
        },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    /* ---------- BUILD CONTEXT ---------- */
    const shairsText = (ghazal.content || [])
      .map(
        (shair: any, index: number) =>
          `Shair ${index + 1}:\n  First line (Misra-e-oola): "${shair.lines?.[0] ?? ""}"\n  Second line (Misra-e-sani): "${shair.lines?.[1] ?? ""}"`
      )
      .join("\n\n");

    const fullContext = `
GHAZAL FULL CONTEXT

POET (TAKHALLUS): ${ghazal.takhallus}
TITLE: ${ghazal.metaTitle || "Untitled"}
DESCRIPTION: ${ghazal.metaDescription || "No description"}
CATEGORIES: ${ghazal.category?.join(", ") || "None"}
TOTAL SHAIRS: ${ghazal.content?.length ?? 0}

ALL SHAIRS (COMPLETE GHAZAL):
${shairsText}

USER'S QUESTION:
"${question}"

INSTRUCTIONS:
- Answer ONLY about THIS specific ghazal above.
- Be specific and reference the actual shairs/lines.
- Provide detailed analysis in a mix of Urdu and English.
`;

    const config = getGroqConfig("analytical");
    const systemPrompt = getSystemPrompt("ANALYZE_GHAZAL");

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
      ghazal: {
        takhallus: ghazal.takhallus,
        slug: ghazal.slug,
        totalShairs: ghazal.content?.length ?? 0,
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
    console.error("Ask Ghazal Error:", error);

    const status = error?.status ?? error?.response?.status;
    const isModelIssue = status === 404;

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
    {
      success: false,
      message: "Use POST to ask a question",
      data: null,
      err: "METHOD_NOT_ALLOWED",
      status: 405,
    },
    { status: 405 }
  );
}