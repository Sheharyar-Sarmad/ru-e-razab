// app/api/ai/ask-ghazal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import GhazalModel from "@/models/kalam/ghazals.model";
import { groq, getGroqConfig, getSystemPrompt } from "@/config/groq.config";

// In-memory cache store
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// HELPER: Get cache key
function getCacheKey(slug: string, question: string): string {
  // Create a consistent key from slug and question
  const normalizedQuestion = question.trim().toLowerCase();
  return `ask:${slug}:${normalizedQuestion}`;
}

// HELPER: Clear cache for a specific ghazal
export function clearGhazalCache(slug: string) {
  const prefix = `ask:${slug}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
  console.log(`Cache cleared for ghazal: ${slug}`);
}

// HELPER: Clear entire cache
export function clearAllCache() {
  cache.clear();
  console.log("All cache cleared");
}

// POST - Ask a question about a ghazal (with caching)
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
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    if (!question) {
      return NextResponse.json(
        {
          success: false,
          message: "Question is required",
          data: null,
          err: "QUESTION_REQUIRED",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    // CHECK CACHE FIRST
    const cacheKey = getCacheKey(slug, question);
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Cache HIT for: ${cacheKey}`);
      return NextResponse.json(
        {
          success: true,
          message: "Question answered successfully (cached)",
          data: cached.data,
          err: null,
          status: HTTP_STATUS.OK,
        },
        {
          status: HTTP_STATUS.OK,
          headers: {
            "X-Cache": "HIT",
            "X-Cache-TTL": `${Math.floor((CACHE_TTL - (Date.now() - cached.timestamp)) / 1000)}s`,
          },
        },
      );
    }

    console.log(`Cache MISS for: ${cacheKey}`);

    // FETCH GHAZAL FROM DATABASE

    // Fetch ghazal with all details
    const ghazal = await GhazalModel.findOne({ slug })
      .select("takhallus content metaTitle metaDescription category")
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
        { status: HTTP_STATUS.NOT_FOUND },
      );
    }

    // BUILD CONTEXT

    // Build FULL structured context (ALL shairs)
    const shairsText = ghazal.content
      .map((shair: any, index: number) => {
        return `Shair ${index + 1}:
  First line (Misra-e-oola): "${shair.lines[0]}"
  Second line (Misra-e-sani): "${shair.lines[1]}"`;
      })
      .join("\n\n");

    const fullContext = `
GHAZAL FULL CONTEXT

POET (TAKHALLUS): ${ghazal.takhallus}
TITLE: ${ghazal.metaTitle || "Untitled"}
DESCRIPTION: ${ghazal.metaDescription || "No description"}
CATEGORIES: ${ghazal.category?.join(", ") || "None"}
TOTAL SHAIRS: ${ghazal.content.length}


📝 ALL SHAIRS (COMPLETE GHAZAL)


${shairsText}


USER'S QUESTION


"${question}"


INSTRUCTIONS


Answer ONLY about THIS specific ghazal above.
Be specific and reference the actual shairs/lines.
Provide detailed analysis in a mix of Urdu and English.
`;

    const config = getGroqConfig("analytical");
    const systemPrompt = `You are an expert in Urdu poetry, ghazals, and literary analysis.
Your task is to analyze the provided ghazal and answer the user's question.
- Always reference specific shairs and lines from the ghazal
- Provide detailed, insightful analysis
- Respond in a mix of Urdu and English
- Be respectful of the poet's work
- Connect themes, poetic devices, and cultural context`;

    // CALL GROQ API

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: fullContext,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 2048,
      top_p: 0.9,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const answer =
      completion.choices[0]?.message?.content || "No response generated";

    const responseData = {
      question,
      answer,
      ghazal: {
        takhallus: ghazal.takhallus,
        slug: ghazal.slug,
        totalShairs: ghazal.content.length,
      },
    };

    // STORE IN CACHE
    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now(),
    });

    console.log(`Cached: ${cacheKey}`);

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
        headers: {
          "X-Cache": "MISS",
        },
      },
    );
  } catch (error) {
    console.error("Ask Ghazal Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to answer question",
        data: null,
        err: "GROQ_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}
