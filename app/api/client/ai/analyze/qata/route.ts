// app/api/ai/analyze-qata/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import QataModel from "@/models/kalam/qata.model";
import { groq, getGroqConfig, getSystemPrompt } from "@/config/groq.config";

// CACHE

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// HELPER: Get cache key

function getCacheKey(slug: string, question: string): string {
  const normalizedQuestion = question?.trim().toLowerCase() || "initial";
  return `analyze-qata:${slug}:${normalizedQuestion}`;
}

// POST - Analyze Qata with Q&A

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
          message: "Qata analysis fetched successfully (cached)",
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

    // FETCH QATA FROM DATABASE

    const qata = await QataModel.findOne({ slug })
      .select("takhallus content metaTitle metaDescription category")
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

    // BUILD STRUCTURED CONTEXT

    // Build shairs text (qata has exactly 2 shairs)
    const shairsText = qata.content
      .map((shair: any, index: number) => {
        return `Shair ${index + 1}:
  First line (Misra-e-oola): "${shair.lines[0]}"
  Second line (Misra-e-sani): "${shair.lines[1]}"`;
      })
      .join("\n\n");

    const fullContext = `
QATA FULL CONTEXT

POET (TAKHALLUS): ${qata.takhallus}
TITLE: ${qata.metaTitle || "Untitled"}
DESCRIPTION: ${qata.metaDescription || "No description"}
CATEGORIES: ${qata.category?.join(", ") || "None"}
TOTAL SHAIRS: ${qata.content.length} (Qata must have exactly 2 shairs)

📝 ALL SHAIRS (COMPLETE QATA):

${shairsText}

📌 ABOUT QATA:
A Qata is a form of Urdu poetry consisting of exactly 2 shairs (couplets).
It is concise and often conveys a complete thought or message in just four lines.

${question ? `❓ USER'S QUESTION:\n"${question}"\n` : ""}

📌 INSTRUCTIONS:
${question ? 
  `Answer ONLY about THIS specific qata above.
   Be specific and reference the actual shairs/lines.
   Provide detailed analysis in a mix of Urdu and English.` :
  `Please provide a comprehensive analysis of this qata including:
   - What is this qata about?
   - Key themes and message
   - Poetic devices used
   - Cultural context
   - Overall impact`
}
`;

    // GET SYSTEM PROMPT

    const config = getGroqConfig("analytical");
    const systemPrompt = `You are an expert in Urdu poetry, qata'at, and literary analysis.
Your task is to analyze the provided qata.

ABOUT QATA:
- A Qata is a form of Urdu poetry with exactly 2 shairs (4 lines total)
- It is concise and often conveys a complete thought or message
- Each shair has 2 lines (misra-e-oola and misra-e-sani)

Your analysis should:
- Reference specific shairs and lines from the qata
- Provide detailed, insightful analysis
- Respond in a mix of Urdu and English
- Be respectful of the poet's work
- Connect themes, poetic devices, and cultural context
- Explain the meaning and significance of the qata`;

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
      qata: {
        takhallus: qata.takhallus,
        slug: qata.slug,
        totalShairs: qata.content.length,
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
        message: question ? "Qata analysis with Q&A generated successfully" : "Qata analysis generated successfully",
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
    console.error("Qata Analysis Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to analyze qata",
        data: null,
        err: "GROQ_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
