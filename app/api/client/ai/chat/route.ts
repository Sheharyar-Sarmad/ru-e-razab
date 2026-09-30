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
type Lang = "ur" | "en";

interface IncomingMessage {
  role: ChatRole;
  content: string;
}

/** Shape Groq's SDK expects (literal role union, not plain string). */
type GroqChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

interface ChatRequestBody {
  message: string;
  messages?: IncomingMessage[];
  /** true when the client intends to read the reply aloud (TTS) */
  voiceMode?: boolean;
  /** the language the user spoke/typed in, if known */
  language?: "ur" | "en" | "auto";
}

/* =========================================================
   CONFIG
   Groq FREE tier limits differ per model (typically ~30 requests/min,
   ~1,000 requests/day, ~12K tokens/min). Check yours at
   https://console.groq.com/settings/limits and tune the env vars below.
   The GLOBAL limits are deliberately set a little under Groq's real
   limits so your users get a friendly message from us instead of a
   raw 429 from Groq.
========================================================= */

const envInt = (name: string, fallback: number): number => {
  const n = parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const LIMITS = {
  // Per visitor (IP)
  IP_PER_MINUTE: envInt("CHAT_IP_PER_MINUTE", 6),
  IP_PER_HOUR: envInt("CHAT_IP_PER_HOUR", 40),
  IP_PER_DAY: envInt("CHAT_IP_PER_DAY", 120),
  // Cheap flood guard: counts EVERY request, even cache hits / invalid ones
  IP_FLOOD_PER_MINUTE: envInt("CHAT_IP_FLOOD_PER_MINUTE", 60),
  // Whole app (protects the shared Groq free-tier quota)
  GLOBAL_PER_MINUTE: envInt("CHAT_GLOBAL_PER_MINUTE", 24),
  GLOBAL_PER_DAY: envInt("CHAT_GLOBAL_PER_DAY", 900),
  // How many replies one visitor may have "in progress" at once
  MAX_IN_FLIGHT_PER_IP: 1,
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_MESSAGES = 5;
const MAX_HISTORY_CHARS = 1000;
/** Keeps each reply cheap on the free tier's tokens-per-minute budget. */
const MAX_OUTPUT_TOKENS = 1024;

/* =========================================================
   CACHE
========================================================= */

const chatCache = new Map<string, { data: unknown; timestamp: number }>();
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
  const oldestFirst = Array.from(chatCache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
  const toRemove = oldestFirst.slice(0, chatCache.size - MAX_CACHE_ENTRIES);
  toRemove.forEach(([key]) => chatCache.delete(key));
}

/* =========================================================
   RATE LIMITING (sliding window)
   NOTE: this lives in server memory. It resets on redeploy and is
   per-instance only. On serverless hosts (e.g. Vercel) each instance has
   its own counters, so for strict enforcement swap the limiter for a
   shared store such as Upstash Redis (@upstash/ratelimit).
========================================================= */

interface LimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSec: number;
}

class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();
  private lastSweep = Date.now();

  constructor(
    readonly limit: number,
    readonly windowMs: number
  ) {}

  private recent(key: string, now: number): number[] {
    return (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
  }

  /** Check without counting the request. */
  peek(key: string): LimitResult {
    const now = Date.now();
    this.sweep(now);
    const arr = this.recent(key, now);

    if (arr.length >= this.limit) {
      const retryAfterSec = Math.max(1, Math.ceil((arr[0] + this.windowMs - now) / 1000));
      return { allowed: false, limit: this.limit, remaining: 0, retryAfterSec };
    }
    return { allowed: true, limit: this.limit, remaining: this.limit - arr.length - 1, retryAfterSec: 0 };
  }

  /** Count one request. */
  record(key: string) {
    const now = Date.now();
    const arr = this.recent(key, now);
    arr.push(now);
    this.hits.set(key, arr);
  }

  /** Drop stale keys so memory doesn't grow forever. */
  private sweep(now: number) {
    if (now - this.lastSweep < MINUTE) return;
    this.lastSweep = now;
    this.hits.forEach((arr, key) => {
      if (arr.length === 0 || now - arr[arr.length - 1] >= this.windowMs) this.hits.delete(key);
    });
  }
}

const ipFlood = new SlidingWindowLimiter(LIMITS.IP_FLOOD_PER_MINUTE, MINUTE);
const ipPerMinute = new SlidingWindowLimiter(LIMITS.IP_PER_MINUTE, MINUTE);
const ipPerHour = new SlidingWindowLimiter(LIMITS.IP_PER_HOUR, HOUR);
const ipPerDay = new SlidingWindowLimiter(LIMITS.IP_PER_DAY, DAY);
const globalPerMinute = new SlidingWindowLimiter(LIMITS.GLOBAL_PER_MINUTE, MINUTE);
const globalPerDay = new SlidingWindowLimiter(LIMITS.GLOBAL_PER_DAY, DAY);

const inFlight = new Map<string, number>();

/** If Groq itself answers 429, we stop calling it until this timestamp. */
let groqCooldownUntil = 0;
let groqCooldownIsDaily = false;

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

/* =========================================================
   FRIENDLY MESSAGES (English + Urdu)
========================================================= */

type LimitScope =
  | "flood"
  | "ip_minute"
  | "ip_hour"
  | "ip_day"
  | "global_minute"
  | "global_day"
  | "provider"
  | "provider_daily"
  | "busy"
  | "unavailable";

const RATE_MESSAGES: Record<LimitScope, Record<Lang, string>> = {
  flood: {
    en: "We're receiving too many requests from you. Please try again in {wait}.",
    ur: "آپ کی طرف سے بہت زیادہ درخواستیں موصول ہو رہی ہیں۔ براہِ کرم {wait} بعد دوبارہ کوشش کریں۔",
  },
  ip_minute: {
    en: "You're sending messages a little too fast. Please wait {wait} and ask again.",
    ur: "آپ بہت تیزی سے پیغامات بھیج رہے ہیں۔ براہِ کرم {wait} انتظار کریں، پھر دوبارہ پوچھیں۔",
  },
  ip_hour: {
    en: "You've reached the hourly chat limit. You can continue in {wait}.",
    ur: "آپ ایک گھنٹے کی گفتگو کی حد تک پہنچ گئے ہیں۔ {wait} بعد آپ دوبارہ گفتگو جاری رکھ سکتے ہیں۔",
  },
  ip_day: {
    en: "You've used up today's chat limit. Please come back in {wait}.",
    ur: "آج کی گفتگو کی حد پوری ہو چکی ہے۔ براہِ کرم {wait} بعد تشریف لائیے۔",
  },
  global_minute: {
    en: "Many people are chatting right now. Please try again in {wait}.",
    ur: "اس وقت بہت سے لوگ گفتگو کر رہے ہیں۔ براہِ کرم {wait} بعد دوبارہ کوشش کریں۔",
  },
  global_day: {
    en: "The AI assistant has reached its daily capacity. Please try again in {wait}.",
    ur: "اے آئی اسسٹنٹ آج کی مجموعی حد تک پہنچ چکا ہے۔ براہِ کرم {wait} بعد دوبارہ کوشش کریں۔",
  },
  provider: {
    en: "The AI service is a bit busy at the moment. Please try again in {wait}.",
    ur: "اے آئی سروس اس وقت کچھ مصروف ہے۔ براہِ کرم {wait} بعد دوبارہ کوشش کریں۔",
  },
  provider_daily: {
    en: "The AI service has reached its daily limit. Please try again in {wait}.",
    ur: "اے آئی سروس آج کی حد تک پہنچ چکی ہے۔ براہِ کرم {wait} بعد دوبارہ کوشش کریں۔",
  },
  busy: {
    en: "Your previous message is still being answered. Please wait for the reply before sending another.",
    ur: "آپ کے پچھلے پیغام کا جواب ابھی تیار ہو رہا ہے۔ براہِ کرم نیا پیغام بھیجنے سے پہلے جواب کا انتظار کریں۔",
  },
  unavailable: {
    en: "The AI service is temporarily unavailable. Please try again in a little while.",
    ur: "اے آئی سروس عارضی طور پر دستیاب نہیں ہے۔ براہِ کرم کچھ دیر بعد کوشش کریں۔",
  },
};

function formatWait(seconds: number, lang: Lang): string {
  const s = Math.max(1, Math.ceil(seconds));
  if (s < 60) return lang === "ur" ? `${s} سیکنڈ` : `${s} second${s === 1 ? "" : "s"}`;
  if (s < 3600) {
    const m = Math.ceil(s / 60);
    return lang === "ur" ? `${m} منٹ` : `${m} minute${m === 1 ? "" : "s"}`;
  }
  const h = Math.ceil(s / 3600);
  return lang === "ur" ? `${h} گھنٹے` : `${h} hour${h === 1 ? "" : "s"}`;
}

function buildRateLimitResponse(
  scope: LimitScope,
  retryAfterSec: number,
  lang: Lang,
  status: number = 429
) {
  const wait = formatWait(retryAfterSec, lang);
  const message = RATE_MESSAGES[scope][lang].replace("{wait}", wait);

  return NextResponse.json(
    {
      success: false,
      message,
      data: { scope, retryAfter: retryAfterSec },
      err: status === 429 ? "RATE_LIMITED" : "SERVICE_UNAVAILABLE",
      status,
    },
    {
      status,
      headers: {
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Scope": scope,
      },
    }
  );
}

/* =========================================================
   SPEECH-FRIENDLY TEXT + LANGUAGE DETECTION
========================================================= */

const URDU_ARABIC_RANGE = /[\u0600-\u06FF\u0750-\u077F]/;

/** Roughly guesses whether text is predominantly Urdu script vs. Latin script. */
function detectLanguage(text: string): Lang {
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
   INPUT HELPERS
========================================================= */

/** Escape user text before it goes into a Mongo $regex (prevents regex errors / ReDoS). */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Never trust client-supplied history: validate shape, cap count and length. */
function sanitizeHistory(raw: unknown): IncomingMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m: any) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map(
      (m: any): IncomingMessage => ({
        role: m.role as ChatRole,
        content: (m.content as string).slice(0, MAX_HISTORY_CHARS),
      })
    );
}

/** Reads Retry-After (seconds) from a Groq SDK error, whether headers is a Headers object or a plain object. */
function getRetryAfterSeconds(error: any): number {
  const h = error?.headers;
  const raw = typeof h?.get === "function" ? h.get("retry-after") : h?.["retry-after"];
  const n = parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 30;
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

  const allPoets: string[] = Array.from(
    new Set<string>([...ghazalPoets, ...shairPoets, ...qataPoets, ...nazmPoets])
  );

  if (allPoets.length > 0) {
    collection += "\n👤 ALL POETS IN MY COLLECTION:\n";
    collection += allPoets.map((p) => `- ${p}`).join("\n");
    collection += "\n\n";
  }

  if (query.length > 2) {
    const safeQuery = escapeRegex(query);

    const [ghazalResults, shairResults, qataResults, nazmResults] = await Promise.all([
      GhazalModel.find({
        $or: [
          { takhallus: { $regex: safeQuery, $options: "i" } },
          { "content.0.lines.0": { $regex: safeQuery, $options: "i" } },
          { metaTitle: { $regex: safeQuery, $options: "i" } },
          { category: { $regex: safeQuery, $options: "i" } },
        ],
      })
        .select("takhallus slug content metaTitle category")
        .limit(5)
        .lean(),
      ShairModel.find({
        $or: [
          { takhallus: { $regex: safeQuery, $options: "i" } },
          { content: { $regex: safeQuery, $options: "i" } },
          { metaTitle: { $regex: safeQuery, $options: "i" } },
          { category: { $regex: safeQuery, $options: "i" } },
        ],
      })
        .select("takhallus slug content metaTitle category")
        .limit(5)
        .lean(),
      QataModel.find({
        $or: [
          { takhallus: { $regex: safeQuery, $options: "i" } },
          { "content.0.lines.0": { $regex: safeQuery, $options: "i" } },
          { metaTitle: { $regex: safeQuery, $options: "i" } },
          { category: { $regex: safeQuery, $options: "i" } },
        ],
      })
        .select("takhallus slug content metaTitle category")
        .limit(5)
        .lean(),
      NazmModel.find({
        $or: [
          { takhallus: { $regex: safeQuery, $options: "i" } },
          { "content.0.lines.0": { $regex: safeQuery, $options: "i" } },
          { metaTitle: { $regex: safeQuery, $options: "i" } },
          { category: { $regex: safeQuery, $options: "i" } },
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
  const ip = getClientIp(request);
  let countedInFlight = false;

  try {
    /* ---------- 1. Cheap flood guard (before any parsing / DB work) ---------- */
    const flood = ipFlood.peek(ip);
    if (!flood.allowed) {
      // We don't know the user's language yet, so answer bilingually-safe: English
      // unless the Accept-Language header prefers Urdu.
      const headerLang: Lang = (request.headers.get("accept-language") || "").toLowerCase().startsWith("ur")
        ? "ur"
        : "en";
      return buildRateLimitResponse("flood", flood.retryAfterSec, headerLang);
    }
    ipFlood.record(ip);

    /* ---------- 2. Parse + validate ---------- */
    let body: ChatRequestBody;
    try {
      body = (await request.json()) as ChatRequestBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body",
          data: null,
          err: "INVALID_BODY",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const { message, voiceMode = false, language = "auto" } = body;

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

    const trimmedMessage = message.trim().slice(0, MAX_MESSAGE_CHARS);
    const history = sanitizeHistory(body.messages);
    const userLang: Lang = language === "ur" || language === "en" ? language : detectLanguage(trimmedMessage);

    /* ---------- 3. Cache (cache hits cost nothing, so they are NOT rate limited) ---------- */
    const cacheKey = buildCacheKey(trimmedMessage, history, voiceMode);
    const cached = chatCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("Cache HIT");
      return NextResponse.json(cached.data, {
        status: HTTP_STATUS.OK,
        headers: { "X-Cache": "HIT" },
      });
    }

    console.log("Cache MISS");

    /* ---------- 4. Is Groq itself cooling down after a 429? ---------- */
    const cooldownLeft = Math.ceil((groqCooldownUntil - Date.now()) / 1000);
    if (cooldownLeft > 0) {
      return buildRateLimitResponse(groqCooldownIsDaily ? "provider_daily" : "provider", cooldownLeft, userLang);
    }

    /* ---------- 5. Layered rate limits (only for requests that will call Groq) ---------- */
    const checks: { scope: LimitScope; limiter: SlidingWindowLimiter; key: string }[] = [
      { scope: "ip_minute", limiter: ipPerMinute, key: ip },
      { scope: "ip_hour", limiter: ipPerHour, key: ip },
      { scope: "ip_day", limiter: ipPerDay, key: ip },
      { scope: "global_minute", limiter: globalPerMinute, key: "global" },
      { scope: "global_day", limiter: globalPerDay, key: "global" },
    ];

    for (const c of checks) {
      const result = c.limiter.peek(c.key);
      if (!result.allowed) {
        return buildRateLimitResponse(c.scope, result.retryAfterSec, userLang);
      }
    }

    // One reply at a time per visitor (stops double-sends and spam-clicking)
    if ((inFlight.get(ip) ?? 0) >= LIMITS.MAX_IN_FLIGHT_PER_IP) {
      return buildRateLimitResponse("busy", 3, userLang);
    }

    // All checks passed: now count the request everywhere
    checks.forEach((c) => c.limiter.record(c.key));
    inFlight.set(ip, (inFlight.get(ip) ?? 0) + 1);
    countedInFlight = true;

    /* ---------- 6. Do the real work ---------- */
    await ConnectDB(EnvSecrets.mongoUri as string);

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
    const chatMessages: GroqChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.map(
        (msg): GroqChatMessage => ({
          role: msg.role, // already "user" | "assistant"
          content: msg.content,
        })
      ),
      { role: "user", content: trimmedMessage },
    ];

    // CALL GROQ API
    const config = getGroqConfig("chat");

    const completion = await groq.chat.completions.create({
      messages: chatMessages,
      model: GROQ_MODEL,
      temperature: config.temperature,
      max_tokens: Math.min(config.max_tokens ?? MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS),
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

    const remaining = ipPerMinute.peek(ip).remaining;

    return NextResponse.json(responseData, {
      status: HTTP_STATUS.OK,
      headers: {
        "X-Cache": "MISS",
        "X-RateLimit-Limit": String(LIMITS.IP_PER_MINUTE),
        "X-RateLimit-Remaining": String(Math.max(0, remaining)),
      },
    });
  } catch (error: any) {
    console.error("Chat Error:", error);

    const status = error?.status ?? error?.response?.status;
    const lang: Lang = "en"; // body may not have been parsed if we got here early

    // Groq told us we're over ITS limit (free tier). Pause calls so we stop hammering it.
    if (status === 429) {
      const retryAfter = getRetryAfterSeconds(error);
      groqCooldownUntil = Date.now() + retryAfter * 1000;
      groqCooldownIsDaily = retryAfter > 5 * 60; // long waits usually mean the daily quota
      return buildRateLimitResponse(groqCooldownIsDaily ? "provider_daily" : "provider", retryAfter, lang);
    }

    // Groq overloaded / down
    if (status === 500 || status === 502 || status === 503 || status === 504) {
      return buildRateLimitResponse("unavailable", 30, lang, 503);
    }

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
  } finally {
    if (countedInFlight) {
      const left = (inFlight.get(ip) ?? 1) - 1;
      if (left <= 0) inFlight.delete(ip);
      else inFlight.set(ip, left);
    }
  }
}