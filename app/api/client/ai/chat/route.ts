// app/api/ai/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import { groq, getGroqConfig } from "@/config/groq.config";
import { getSystemPrompt } from "@/lib/system.prompt";
import GhazalModel from "@/models/kalam/ghazals.model";
import ShairModel from "@/models/kalam/shair.model";
import QataModel from "@/models/kalam/qata.model";
import NazmModel from "@/models/kalam/nazm.model";

// CACHE

const chatCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// GET POETRY COLLECTION (Full Database Access)

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

    const hasResults = ghazalResults.length > 0 || shairResults.length > 0 || 
                       qataResults.length > 0 || nazmResults.length > 0;

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

// POST - AI Chat

export async function POST(request: NextRequest) {
  try {
    await ConnectDB(EnvSecrets.mongoUri as string);

    const body = await request.json();
    const { message, messages = [] } = body;

    if (!message) {
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

    // CHECK CACHE

    const cacheKey = `chat:${message}`;
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
      poetryCollection = await getPoetryCollection(message);
      console.log("Full poetry collection fetched");
    } catch (error) {
      console.error("Error fetching poetry:", error);
      poetryCollection = "I have a beautiful collection of poetry by RAZAB Tabraiz.";
    }

    // GET SYSTEM PROMPT

    let systemPrompt = getSystemPrompt("CHAT");

    // Append the full poetry collection to the system prompt
    systemPrompt = systemPrompt.replace(
      "ABOUT THE POETRY COLLECTION:",
      `ABOUT THE POETRY COLLECTION:\n${poetryCollection}`
    );

    // PREPARE MESSAGES

    const chatMessages = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...(messages || []).slice(-5).map((msg: any) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      })),
      {
        role: "user",
        content: message,
      },
    ];

    // CALL GROQ API

    const config = getGroqConfig("chat");

    const completion = await groq.chat.completions.create({
      messages: chatMessages,
      model: config.model,
      temperature: 0.7,
      max_tokens: config.maxTokens,
      top_p: config.topP,
    });

    const response = completion.choices[0]?.message?.content || "No response generated";

    const responseData = {
      success: true,
      message: "Chat response generated successfully",
      data: {
        response,
        timestamp: new Date().toISOString(),
      },
      err: null,
      status: HTTP_STATUS.OK,
    };

    chatCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now(),
    });

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