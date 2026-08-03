// app/api/ai/analyze-nazm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import NazmModel from "@/models/kalam/nazm.model";
import { groq, getGroqConfig, getSystemPrompt } from "@/config/groq.config";

// CACHE

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// HELPER: Get cache key

function getCacheKey(slug: string, question: string): string {
  const normalizedQuestion = question?.trim().toLowerCase() || "initial";
  return `analyze-nazm:${slug}:${normalizedQuestion}`;
}

// POST - Analyze Nazm with Q&A

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
          message: "Nazm analysis fetched successfully (cached)",
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

    // FETCH NAZM FROM DATABASE

    const nazm = await NazmModel.findOne({ slug })
      .select("takhallus content metaTitle metaDescription category")
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

    // BUILD STRUCTURED CONTEXT

    // Build stanzas text
    const stanzasText = nazm.content
      .map((stanza: any, index: number) => {
        const lines = stanza.lines.map((line: string, i: number) => 
          `  Line ${i + 1}: "${line}"`
        ).join("\n");
        return `Stanza ${index + 1}:\n${lines}`;
      })
      .join("\n\n");

    const totalLines = nazm.content.reduce((acc: number, stanza: any) => acc + stanza.lines.length, 0);

    const fullContext = `
NAZM FULL CONTEXT

POET (TAKHALLUS): ${nazm.takhallus}
TITLE: ${nazm.metaTitle || "Untitled"}
DESCRIPTION: ${nazm.metaDescription || "No description"}
CATEGORIES: ${nazm.category?.join(", ") || "None"}
TOTAL STANZAS: ${nazm.content.length}
TOTAL LINES: ${totalLines}

📝 ALL STANZAS (COMPLETE NAZM):

${stanzasText}

📌 ABOUT NAZM:
A Nazm is a form of Urdu poetry that can vary in length and structure.
Unlike ghazals, nazms follow a single theme throughout the poem.
They can have multiple stanzas with varying numbers of lines.
Nazms often explore social, philosophical, political, or romantic themes.

${question ? `❓ USER'S QUESTION:\n"${question}"\n` : ""}

📌 INSTRUCTIONS:
${question ? 
  `Answer ONLY about THIS specific nazm above.
   Be specific and reference the actual stanzas and lines.
   Provide detailed analysis in a mix of Urdu and English.` :
  `Please provide a comprehensive analysis of this nazm including:
   - What is this nazm about? (Overall theme and message)
   - Stanza-by-stanza analysis
   - Key themes and motifs
   - Poetic devices used (metaphor, simile, imagery, repetition)
   - Historical and cultural context
   - Emotional impact and depth
   - The poet's style and influences
   - Social or philosophical commentary (if any)`
}
`;

    // GET SYSTEM PROMPT

    const config = getGroqConfig("analytical");
    const systemPrompt = `You are an expert in Urdu poetry, nazms, and literary analysis.
Your task is to analyze the provided nazm.

ABOUT NAZM:
- A Nazm is a form of Urdu poetry with a single continuous theme
- Unlike ghazals, nazms follow a unified subject throughout
- Can have multiple stanzas with varying line counts
- Often explores social, philosophical, political, or romantic themes
- Uses various poetic devices and imagery

Your analysis should:
- Reference specific stanzas and lines from the nazm
- Provide detailed, insightful analysis
- Respond in a mix of Urdu and English
- Be respectful of the poet's work
- Connect themes, poetic devices, and cultural context
- Explain the meaning and significance of the nazm`;

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
      nazm: {
        takhallus: nazm.takhallus,
        slug: nazm.slug,
        totalStanzas: nazm.content.length,
        totalLines: totalLines,
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
        message: question ? "Nazm analysis with Q&A generated successfully" : "Nazm analysis generated successfully",
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
    console.error("Nazm Analysis Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to analyze nazm",
        data: null,
        err: "GROQ_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}