// app/api/ai/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import { groq, getGroqConfig, GROQ_MODEL } from "@/config/groq.config";
import { getSystemPrompt } from "@/lib/system.prompt";
import GhazalModel from "@/models/kalam/ghazals.model";
import ShairModel from "@/models/kalam/shair.model";
import QataModel from "@/models/kalam/qata.model";
import NazmModel from "@/models/kalam/nazm.model";

/* =========================================================
   TYPES
========================================================= */

type ChatRole = "user" | "assistant";

interface IncomingMessage {
  role: ChatRole;
  content: string;
}

interface ChatRequestBody {
  message: string;
  messages?: IncomingMessage[];
  /** true when the client intends to read the reply aloud (TTS) */
  voiceMode?: boolean;
  /** the language the user spoke/typed in, if known */
  language?: "ur" | "en" | "auto";
}

/* =========================================================
   CACHE
========================================================= */

const chatCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 500;

function buildCacheKey(message: string, messages: IncomingMessage[], voiceMode: boolean): string {
  // Include a slice of prior turns so a follow-up question doesn't collide
  // with an unrelated earlier question that happened to use the same words.
  const historyFingerprint = messages
    .slice(-3)
    .map((m) => `${m.role}:${m.content}`)
    .join("|");
  return `chat:${voiceMode ? "v" : "t"}:${historyFingerprint}::${message}`;
}

function pruneCache() {
  if (chatCache.size <= MAX_CACHE_ENTRIES) return;
  const oldestFirst = [...chatCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
  const toRemove = oldestFirst.slice(0, chatCache.size - MAX_CACHE_ENTRIES);
  toRemove.forEach(([key]) => chatCache.delete(key));
}

/* =========================================================
   NAIVE IN-MEMORY RATE LIMITING
   NOTE: this resets on redeploy/restart and is per-instance only.
   Swap for a shared store (e.g. Redis/Upstash) before scaling to
   more than one server instance.
========================================================= */

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const rateLimitBuckets = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(ip);

  if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(ip, { count: 1, windowStart: now });
    return false;
  }

  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX_REQUESTS;
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

/* =========================================================
   SPEECH-FRIENDLY TEXT + LANGUAGE DETECTION
========================================================= */

const URDU_ARABIC_RANGE = /[\u0600-\u06FF\u0750-\u077F]/;

/** Roughly guesses whether text is predominantly Urdu script vs. Latin script. */
function detectLanguage(text: string): "ur" | "en" {
  const urduChars = text.match(new RegExp(URDU_ARABIC_RANGE, "g"))?.length ?? 0;
  const latinChars = text.match(/[A-Za-z]/g)?.length ?? 0;
  return urduChars > latinChars ? "ur" : "en";
}

/** Strips markdown/formatting artifacts so text-to-speech reads naturally. */
function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "") // fenced code blocks
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/!\[[^\]]*]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1") // links -> label only
    .replace(/[*_#>~]+/g, "") // markdown emphasis / headers / quotes
    .replace(/^\s*[-•]\s+/gm, "") // bullet markers
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/* =========================================================
   GET POETRY COLLECTION (Full Database Access)
========================================================= */

async function getPoetryCollection(query: string): Promise<string> {
  let collection = "";
  const allGhazals = await GhazalModel.find({})
    .select("takhallus slug content metaTitle metaDescription category")
    .limit(30)
    .lean();

  if (allGhazals.length > 0) {
    collection += "📚 GHAZALS IN MY COLLECTION:\n\n";
    allGhazals.forEach((ghazal: any, index: number) => {
      collection += `${index + 1}. "${ghazal.metaTitle || ghazal.content[0]?.lines[0] || "Untitled"}"\n`;
      collection += `   Poet: ${ghazal.takhallus}\n`;
      collection += `   Slug: ${ghazal.slug}\n`;
      if (ghazal.content && ghazal.content.length > 0) {
        const firstShair = ghazal.content[0];
        collection += `   "${firstShair.lines[0]}"\n`;
        collection += `   "${firstShair.lines[1]}"\n`;
      }
      collection += "\n";
    });
  }

  const allShairs = await ShairModel.find({})
    .select("takhallus slug content metaTitle metaDescription category")
    .limit(30)
    .lean();

  if (allShairs.length > 0) {
    collection += "📝 SHAIRS IN MY COLLECTION:\n\n";
    allShairs.forEach((shair: any, index: number) => {
      collection += `${index + 1}. "${shair.metaTitle || shair.content[0] || "Untitled"}"\n`;
      collection += `   Poet: ${shair.takhallus}\n`;
      collection += `   Slug: ${shair.slug}\n`;
      collection += `   "${shair.content[0]}"\n`;
      collection += `   "${shair.content[1]}"\n`;
      collection += "\n";
    });
  }

  const allQatas = await QataModel.find({})
    .select("takhallus slug content metaTitle metaDescription category")
    .limit(30)
    .lean();

  if (allQatas.length > 0) {
    collection += "📜 QATAS IN MY COLLECTION:\n\n";
    allQatas.forEach((qata: any, index: number) => {
      collection += `${index + 1}. "${qata.metaTitle || qata.content[0]?.lines[0] || "Untitled"}"\n`;
      collection += `   Poet: ${qata.takhallus}\n`;
      collection += `   Slug: ${qata.slug}\n`;
      if (qata.content && qata.content.length > 0) {
        const firstShair = qata.content[0];
        collection += `   "${firstShair.lines[0]}"\n`;
        collection += `   "${firstShair.lines[1]}"\n`;
      }
      collection += "\n";
    });
  }

  const allNazms = await NazmModel.find({})
    .select("takhallus slug content metaTitle metaDescription category")
    .limit(30)
    .lean();

  if (allNazms.length > 0) {
    collection += "📖 NAZMS IN MY COLLECTION:\n\n";
    allNazms.forEach((nazm: any, index: number) => {
      collection += `${index + 1}. "${nazm.metaTitle || "Untitled"}"\n`;
      collection += `   Poet: ${nazm.takhallus}\n`;
      collection += `   Slug: ${nazm.slug}\n`;
      collection += `   Total Stanzas: ${nazm.content?.length || 0}\n`;
      if (nazm.content && nazm.content.length > 0) {
        const firstStanza = nazm.content[0];
        if (firstStanza.lines && firstStanza.lines.length > 0) {
          collection += `   First Line: "${firstStanza.lines[0]}"\n`;
        }
      }
      collection += "\n";
    });
  }

  const [ghazalPoets, shairPoets, qataPoets, nazmPoets] = await Promise.all([
    GhazalModel.distinct("takhallus"),
    ShairModel.distinct("takhallus"),
    QataModel.distinct("takhallus"),
    NazmModel.distinct("takhallus"),
  ]);

  const allPoets = [...new Set([...ghazalPoets, ...shairPoets, ...qataPoets, ...nazmPoets])];

  if (allPoets.length > 0) {
    collection += "\n👤 ALL POETS IN MY COLLECTION:\n";
    collection += allPoets.map((p: any) => `- ${p}`).join("\n");
    collection += "\n\n";
  }

  if (query.length > 2) {
    const [ghazalResults, shairResults, qataResults, nazmResults] = await Promise.all([
      GhazalModel.find({
        $or: [
          { takhallus: { $regex: query, $options: "i" } },
          { "content.0.lines.0": { $regex: query, $options: "i" } },
          { metaTitle: { $regex: query, $options: "i" } },
          { category: { $regex: query, $options: "i" } },
        ],
      })
        .select("takhallus slug content metaTitle category")
        .limit(5)
        .lean(),
      ShairModel.find({
        $or: [
          { takhallus: { $regex: query, $options: "i" } },
          { content: { $regex: query, $options: "i" } },
          { metaTitle: { $regex: query, $options: "i" } },
          { category: { $regex: query, $options: "i" } },
        ],
      })
        .select("takhallus slug content metaTitle category")
        .limit(5)
        .lean(),
      QataModel.find({
        $or: [
          { takhallus: { $regex: query, $options: "i" } },
          { "content.0.lines.0": { $regex: query, $options: "i" } },
          { metaTitle: { $regex: query, $options: "i" } },
          { category: { $regex: query, $options: "i" } },
        ],
      })
        .select("takhallus slug content metaTitle category")
        .limit(5)
        .lean(),
      NazmModel.find({
        $or: [
          { takhallus: { $regex: query, $options: "i" } },
          { "content.0.lines.0": { $regex: query, $options: "i" } },
          { metaTitle: { $regex: query, $options: "i" } },
          { category: { $regex: query, $options: "i" } },
        ],
      })
        .select("takhallus slug content metaTitle category")
        .limit(5)
        .lean(),
    ]);

    const hasResults =
      ghazalResults.length > 0 || shairResults.length > 0 || qataResults.length > 0 || nazmResults.length > 0;

    if (hasResults) {
      collection += `\n🔍 SEARCH RESULTS FOR "${query}":\n\n`;

      if (ghazalResults.length > 0) {
        collection += "📚 Ghazals:\n";
        ghazalResults.forEach((result: any, index: number) => {
          collection += `  ${index + 1}. "${result.metaTitle || result.content[0]?.lines[0] || "Untitled"}"\n`;
          collection += `     Poet: ${result.takhallus}\n`;
          collection += `     Slug: ${result.slug}\n`;
        });
        collection += "\n";
      }

      if (shairResults.length > 0) {
        collection += "📝 Shairs:\n";
        shairResults.forEach((result: any, index: number) => {
          collection += `  ${index + 1}. "${result.metaTitle || result.content[0] || "Untitled"}"\n`;
          collection += `     Poet: ${result.takhallus}\n`;
          collection += `     Slug: ${result.slug}\n`;
        });
        collection += "\n";
      }

      if (qataResults.length > 0) {
        collection += "📜 Qatas:\n";
        qataResults.forEach((result: any, index: number) => {
          collection += `  ${index + 1}. "${result.metaTitle || result.content[0]?.lines[0] || "Untitled"}"\n`;
          collection += `     Poet: ${result.takhallus}\n`;
          collection += `     Slug: ${result.slug}\n`;
        });
        collection += "\n";
      }

      if (nazmResults.length > 0) {
        collection += "📖 Nazms:\n";
        nazmResults.forEach((result: any, index: number) => {
          collection += `  ${index + 1}. "${result.metaTitle || "Untitled"}"\n`;
          collection += `     Poet: ${result.takhallus}\n`;
          collection += `     Slug: ${result.slug}\n`;
        });
        collection += "\n";
      }
    }
  }

  const [totalGhazals, totalShairs, totalQatas, totalNazms] = await Promise.all([
    GhazalModel.countDocuments(),
    ShairModel.countDocuments(),
    QataModel.countDocuments(),
    NazmModel.countDocuments(),
  ]);

  const totalPoetry = totalGhazals + totalShairs + totalQatas + totalNazms;

  collection += `\n📊 COLLECTION STATISTICS:\n`;
  collection += `- Total Ghazals: ${totalGhazals}\n`;
  collection += `- Total Shairs: ${totalShairs}\n`;
  collection += `- Total Qatas: ${totalQatas}\n`;
  collection += `- Total Nazms: ${totalNazms}\n`;
  collection += `- Total Poetry Pieces: ${totalPoetry}\n`;

  return collection;
}

/* =========================================================
   POST - AI CHAT
========================================================= */

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many requests. Please slow down and try again shortly.",
          data: null,
          err: "RATE_LIMITED",
          status: HTTP_STATUS.TOO_MANY_REQUESTS ?? 429,
        },
        { status: 429 }
      );
    }

    await ConnectDB(EnvSecrets.mongoUri as string);

    const body = (await request.json()) as ChatRequestBody;
    const { message, messages = [], voiceMode = false, language = "auto" } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Message is required",
          data: null,
          err: "MESSAGE_REQUIRED",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const trimmedMessage = message.trim().slice(0, 2000);

    // CHECK CACHE

    const cacheKey = buildCacheKey(trimmedMessage, messages, voiceMode);
    const cached = chatCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("Cache HIT");
      return NextResponse.json(cached.data, {
        status: HTTP_STATUS.OK,
        headers: { "X-Cache": "HIT" },
      });
    }

    console.log("Cache MISS");

    // GET FULL POETRY COLLECTION

    let poetryCollection = "";
    try {
      poetryCollection = await getPoetryCollection(trimmedMessage);
      console.log("Full poetry collection fetched");
    } catch (error) {
      console.error("Error fetching poetry:", error);
      poetryCollection = "I have a beautiful collection of poetry by RAZAB Tabraiz.";
    }

    // GET SYSTEM PROMPT

    let systemPrompt = getSystemPrompt("CHAT");

    systemPrompt = systemPrompt.replace(
      "ABOUT THE POETRY COLLECTION:",
      `ABOUT THE POETRY COLLECTION:\n${poetryCollection}`
    );

    // When the reply will be read aloud, ask the model to keep it speakable:
    // short sentences, no markdown tables/headers, no long bullet lists.
    if (voiceMode) {
      systemPrompt += `\n\nVOICE MODE:
The user is listening to your reply out loud through text-to-speech.
- Keep sentences short and natural to speak.
- Avoid markdown formatting, headings, and bullet lists.
- Avoid long numbered lists; speak in flowing sentences instead.
- Still speak warmly, like reciting poetry to a friend.`;
    }

    if (language === "ur") {
      systemPrompt += `\n\nThe user is speaking to you in Urdu. Prefer replying primarily in Urdu.`;
    } else if (language === "en") {
      systemPrompt += `\n\nThe user is speaking to you in English. Prefer replying primarily in English.`;
    }

    // PREPARE MESSAGES

    const chatMessages = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...messages.slice(-5).map((msg) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      })),
      {
        role: "user",
        content: trimmedMessage,
      },
    ];

    // CALL GROQ API

    const config = getGroqConfig("chat");

    const completion = await groq.chat.completions.create({
      messages: chatMessages,
      model: GROQ_MODEL,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      top_p: config.top_p,
      frequency_penalty: config.frequency_penalty,
      presence_penalty: config.presence_penalty,
    });

    const response = completion.choices[0]?.message?.content || "No response generated";
    const speechText = cleanForSpeech(response);
    const detectedLanguage = detectLanguage(response);

    const responseData = {
      success: true,
      message: "Chat response generated successfully",
      data: {
        response,
        speech: speechText,
        language: detectedLanguage,
        timestamp: new Date().toISOString(),
      },
      err: null,
      status: HTTP_STATUS.OK,
    };

    chatCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now(),
    });
    pruneCache();

    return NextResponse.json(responseData, {
      status: HTTP_STATUS.OK,
      headers: { "X-Cache": "MISS" },
    });
  } catch (error) {
    console.error("Chat Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate chat response",
        data: null,
        err: "CHAT_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}