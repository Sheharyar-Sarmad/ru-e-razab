// app/api/client/ai/analyze/qata/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import QataModel from "@/models/kalam/qata.model";
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
  return `ask-qata:${slug}:${question.trim().toLowerCase()}`;
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

    const qata: any = await QataModel.findOne({ slug })
      .select("takhallus slug content metaTitle metaDescription category")
      .lean();

    if (!qata) {
      return NextResponse.json(
        {
          success: false,
          message: "Qata not found",
          data: null,
          err: "QATA_NOT_FOUND",
          status: HTTP_STATUS.NOT_FOUND,
        },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const shairsText = (qata.content || [])
      .map(
        (shair: any, index: number) =>
          `Shair ${index + 1}:\n  First:  "${shair.lines?.[0] ?? ""}"\n  Second: "${shair.lines?.[1] ?? ""}"`
      )
      .join("\n\n");

    const fullContext = `
QATA FULL CONTEXT

POET (TAKHALLUS): ${qata.takhallus}
DESCRIPTION: ${qata.metaDescription || "No description"}
CATEGORIES: ${qata.category?.join(", ") || "None"}
TOTAL SHAIRS: ${qata.content?.length ?? 0}

ALL SHAIRS:
${shairsText}

USER'S QUESTION:
"${question}"

INSTRUCTIONS:
- Answer ONLY about THIS specific qata.
- Reference specific shairs.
- Respond in a mix of Urdu and English.
`;

    const config = getGroqConfig("analytical");
    const systemPrompt = getSystemPrompt("ANALYZE_QATA");

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
      qata: {
        takhallus: qata.takhallus,
        slug: qata.slug,
        totalShairs: qata.content?.length ?? 0,
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
    console.error("Ask Qata Error:", error);
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