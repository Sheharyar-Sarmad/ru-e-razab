// app/api/ai/analyze-shair/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import ShairModel from "@/models/kalam/shair.model";
import { groq, getGroqConfig, getSystemPrompt } from "@/config/groq.config";

// CACHE

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// HELPER: Get cache key

function getCacheKey(slug: string, question: string): string {
  const normalizedQuestion = question?.trim().toLowerCase() || "initial";
  return `analyze-shair:${slug}:${normalizedQuestion}`;
}

// POST - Analyze Shair with Q&A

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

    // CHECK CACHE

    const cacheKey = getCacheKey(slug, question || "initial");
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Cache HIT for: ${cacheKey}`);
      return NextResponse.json(
        {
          success: true,
          message: "Shair analysis fetched successfully (cached)",
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
        }
      );
    }

    console.log(`Cache MISS for: ${cacheKey}`);

    // FETCH SHAIR FROM DATABASE

    const shair = await ShairModel.findOne({ slug })
      .select("takhallus content metaTitle metaDescription category")
      .lean();

    if (!shair) {
      return NextResponse.json(
        {
          success: false,
          message: "Shair not found",
          data: null,
          err: "SHAIR_NOT_FOUND",
          status: HTTP_STATUS.NOT_FOUND,
        },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // BUILD STRUCTURED CONTEXT

    const fullContext = `
SHAIR FULL CONTEXT

POET (TAKHALLUS): ${shair.takhallus}
TITLE: ${shair.metaTitle || "Untitled"}
DESCRIPTION: ${shair.metaDescription || "No description"}
CATEGORIES: ${shair.category?.join(", ") || "None"}

📝 THE SHAIR (2 LINES):

First line (Misra-e-oola): "${shair.content[0]}"
Second line (Misra-e-sani): "${shair.content[1]}"

📌 ABOUT SHAIR:
A Shair is a Urdu couplet consisting of exactly 2 lines.
It is concise, powerful, and often conveys deep meaning in just two lines.

${question ? `❓ USER'S QUESTION:\n"${question}"\n` : ""}

📌 INSTRUCTIONS:
${question ? 
  `Answer ONLY about THIS specific shair above.
   Be specific and reference the actual lines.
   Provide detailed analysis in a mix of Urdu and English.` :
  `Please provide a comprehensive analysis of this shair including:
   - What is this shair about?
   - Key themes and message
   - Poetic devices used (metaphor, simile, imagery)
   - Cultural context
   - Emotional impact
   - Deeper meaning and interpretation`
}
`;

    // GET SYSTEM PROMPT

    const config = getGroqConfig("analytical");
    const systemPrompt = `You are an expert in Urdu poetry, shairs, and literary analysis.
Your task is to analyze the provided shair.

ABOUT SHAIR:
- A Shair is a Urdu couplet with exactly 2 lines
- Each line is called a misra (misra-e-oola and misra-e-sani)
- It is concise, powerful, and often conveys deep meaning

Your analysis should:
- Reference specific lines from the shair
- Provide detailed, insightful analysis
- Respond in a mix of Urdu and English
- Be respectful of the poet's work
- Connect themes, poetic devices, and cultural context
- Explain the meaning and significance of the shair`;

    // PREPARE MESSAGES

    const chatMessages = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: fullContext,
      },
    ];

    // CALL GROQ API

    const completion = await groq.chat.completions.create({
      messages: chatMessages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 2048,
      top_p: 0.9,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const analysis = completion.choices[0]?.message?.content || "No analysis generated";

    // BUILD RESPONSE

    const responseData = {
      shair: {
        takhallus: shair.takhallus,
        slug: shair.slug,
        lines: shair.content,
      },
      analysis,
      question: question || null,
      hasQuestion: !!question,
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
        message: question ? "Shair analysis with Q&A generated successfully" : "Shair analysis generated successfully",
        data: responseData,
        err: null,
        status: HTTP_STATUS.OK,
      },
      {
        status: HTTP_STATUS.OK,
        headers: {
          "X-Cache": "MISS",
        },
      }
    );
  } catch (error) {
    console.error("Shair Analysis Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to analyze shair",
        data: null,
        err: "GROQ_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}