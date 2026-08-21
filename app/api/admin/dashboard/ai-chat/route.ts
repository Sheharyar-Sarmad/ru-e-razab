// app/api/admin/dashboard/ai-chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { groq, getAvailableModels, getGroqConfig } from "@/config/groq.config";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import GhazalModel from "@/models/kalam/ghazals.model";
import ShairModel from "@/models/kalam/shair.model";
import NazmModel from "@/models/kalam/nazm.model";
import QataModel from "@/models/kalam/qata.model";
import UserAccountModel from "@/models/auth/user.account.model";

// BASE PROMPT – unchanged

const ADMIN_ASSISTANT_BASE = `You are RAZAB AI, the administrative assistant for the Ru-e-Razab platform.
You are a world‑class data analyst with access to real‑time platform metrics.
Your insights help admins make data‑driven decisions about content, users, and engagement.

You have been given a comprehensive dataset (below). Use it to:
- Answer questions with precision and cite numbers.
- Spot trends, anomalies, and patterns.
- Suggest actionable improvements.
- Explain correlations between metrics.
- Predict future trends based on current data (use linear extrapolation when appropriate).

STYLE:
- Professional, concise, and authoritative.
- Use bullet points or short paragraphs for clarity.
- When numbers are involved, round to 1 decimal unless exact integers matter.
- Always back up statements with data.

Remember: You are the admin's trusted data analyst for Ru-e-Razab.`;

// HELPER: Calculate linear trend (slope) – unchanged

function calculateSlope(data: { year: number; month: number; value: number }[]): number {
  if (data.length < 2) return 0;
  const n = data.length;
  const x = data.map((_, i) => i);
  const y = data.map(d => d.value);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
}

// MAIN POST HANDLER
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request
    const { messages } = await request.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, message: "Messages array is required", err: "INVALID_REQUEST" },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // 2. Connect to DB
    await ConnectDB(EnvSecrets.mongoUri as string);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // A. BASIC COUNTS

    const [ghazalCount, shairCount, nazmCount, qataCount, userCount] = await Promise.all([
      GhazalModel.countDocuments(),
      ShairModel.countDocuments(),
      NazmModel.countDocuments(),
      QataModel.countDocuments(),
      UserAccountModel.countDocuments(),
    ]);

    // B. AGGREGATED METRICS FOR EACH KALAM TYPE

    const aggregateMetrics = async (Model: any, modelName: string) => {
      const [
        total,
        totalViews,
        avgViews,
        totalLikes,
        avgLikes,
        totalComments,
        avgComments,
        topViewed,
        topLiked,
        topCommented,
        categoryStats,
        monthlyTrends,
      ] = await Promise.all([
        Model.countDocuments(),
        Model.aggregate([{ $group: { _id: null, total: { $sum: "$views" } } }]).then(r => r[0]?.total || 0),
        Model.aggregate([{ $group: { _id: null, avg: { $avg: "$views" } } }]).then(r => r[0]?.avg || 0),
        Model.aggregate([{ $project: { likesCount: { $size: "$likes" } } }, { $group: { _id: null, total: { $sum: "$likesCount" } } }]).then(r => r[0]?.total || 0),
        Model.aggregate([{ $project: { likesCount: { $size: "$likes" } } }, { $group: { _id: null, avg: { $avg: "$likesCount" } } }]).then(r => r[0]?.avg || 0),
        Model.aggregate([{ $project: { commentsCount: { $size: "$comments" } } }, { $group: { _id: null, total: { $sum: "$commentsCount" } } }]).then(r => r[0]?.total || 0),
        Model.aggregate([{ $project: { commentsCount: { $size: "$comments" } } }, { $group: { _id: null, avg: { $avg: "$commentsCount" } } }]).then(r => r[0]?.avg || 0),
        Model.find().sort({ views: -1 }).limit(5).select("content.0.lines.0 takhallus views").lean().then(docs => docs.map(d => ({ firstLine: d.content?.[0]?.lines?.[0] || "Untitled", takhallus: d.takhallus, views: d.views }))),
        Model.aggregate([
          { $addFields: { likesCount: { $size: "$likes" } } },
          { $sort: { likesCount: -1 } },
          { $limit: 5 },
          { $project: { firstLine: { $arrayElemAt: ["$content.0.lines", 0] }, takhallus: 1, likesCount: 1 } }
        ]).then(res => res.map(d => ({ firstLine: d.firstLine || "Untitled", takhallus: d.takhallus, likes: d.likesCount }))),
        Model.aggregate([
          { $addFields: { commentsCount: { $size: "$comments" } } },
          { $sort: { commentsCount: -1 } },
          { $limit: 1 },
          { $project: { firstLine: { $arrayElemAt: ["$content.0.lines", 0] }, takhallus: 1, commentsCount: 1 } }
        ]).then(res => res[0] || null),
        Model.aggregate([
          { $unwind: "$category" },
          { $group: { _id: "$category", count: { $sum: 1 }, avgViews: { $avg: "$views" }, avgLikes: { $avg: { $size: "$likes" } } } },
          { $sort: { count: -1 } }
        ]),
        Model.aggregate([
          { $match: { createdAt: { $gte: sixMonthsAgo } } },
          { $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            count: { $sum: 1 },
            totalViews: { $sum: "$views" },
            totalLikes: { $sum: { $size: "$likes" } }
          } },
          { $sort: { "_id.year": 1, "_id.month": 1 } }
        ])
      ]);
      return { total, totalViews, avgViews, totalLikes, avgLikes, totalComments, avgComments, topViewed, topLiked, topCommented, categoryStats, monthlyTrends };
    };

    const [ghazalMetrics, shairMetrics, nazmMetrics, qataMetrics] = await Promise.all([
      aggregateMetrics(GhazalModel, "Ghazal"),
      aggregateMetrics(ShairModel, "Shair"),
      aggregateMetrics(NazmModel, "Nazm"),
      aggregateMetrics(QataModel, "Qata"),
    ]);

    // C. USER & COMMENT METRICS

    const [totalDistinctCommenters, activeUsersLast30Days, userSignupsMonthly] = await Promise.all([
      GhazalModel.aggregate([{ $unwind: "$comments" }, { $group: { _id: "$comments.user" } }, { $count: "total" }]).then(r => r[0]?.total || 0),
      GhazalModel.aggregate([
        { $unwind: "$comments" },
        { $match: { "comments.createdAt": { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: "$comments.user" } },
        { $count: "active" }
      ]).then(r => r[0]?.active || 0),
      UserAccountModel.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        { $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 }
        } },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ])
    ]);

    // D. WEEKLY PATTERNS (Ghazal views and comments)

    const [weeklyGhazalViews, weeklyComments] = await Promise.all([
      GhazalModel.aggregate([
        { $group: {
          _id: { dayOfWeek: { $dayOfWeek: "$createdAt" } },
          totalViews: { $sum: "$views" }
        }},
        { $sort: { "_id.dayOfWeek": 1 } }
      ]),
      GhazalModel.aggregate([
        { $unwind: "$comments" },
        { $group: {
          _id: { dayOfWeek: { $dayOfWeek: "$comments.createdAt" } },
          totalComments: { $sum: 1 }
        }},
        { $sort: { "_id.dayOfWeek": 1 } }
      ])
    ]);

    // E. ANOMALY DETECTION

    const [viewsMean, viewsStdDev] = await GhazalModel.aggregate([
      { $group: { _id: null, avg: { $avg: "$views" }, std: { $stdDevPop: "$views" } } }
    ]).then(r => [r[0]?.avg || 0, r[0]?.std || 0]);

    const anomalyThreshold = viewsMean + 2 * viewsStdDev;
    const anomalousGhazals = await GhazalModel.find({ views: { $gt: anomalyThreshold } })
      .sort({ views: -1 })
      .limit(5)
      .select("content.0.lines.0 takhallus views")
      .lean()
      .then(docs => docs.map(d => ({ firstLine: d.content?.[0]?.lines?.[0] || "Untitled", takhallus: d.takhallus, views: d.views })));

    // F. PREDICTIVE TRENDS

    const ghazalViewTrend = ghazalMetrics.monthlyTrends.map(m => ({ year: m._id.year, month: m._id.month, value: m.totalViews }));
    const viewSlope = calculateSlope(ghazalViewTrend);
    const nextMonthViews = ghazalViewTrend.length > 0 ? Math.round(ghazalViewTrend[ghazalViewTrend.length - 1].value + viewSlope) : 0;

    const userSignupTrend = userSignupsMonthly.map(m => ({ year: m._id.year, month: m._id.month, value: m.count }));
    const userSlope = calculateSlope(userSignupTrend);
    const nextMonthUsers = userSignupTrend.length > 0 ? Math.round(userSignupTrend[userSignupTrend.length - 1].value + userSlope) : 0;

    // G. ADVANCED PATTERNS

    // 1. Top takhallus (poet) by total views across ghazals
    const topPoets = await GhazalModel.aggregate([
      { $group: { _id: "$takhallus", totalViews: { $sum: "$views" }, totalLikes: { $sum: { $size: "$likes" } }, totalComments: { $sum: { $size: "$comments" } } } },
      { $sort: { totalViews: -1 } },
      { $limit: 5 }
    ]);

    // 2. Category correlation (views vs likes) – just compute a simple correlation coefficient
    // For simplicity, we'll just compute average views and likes per category and present
    const categoryPerformance = await GhazalModel.aggregate([
      { $unwind: "$category" },
      { $group: { _id: "$category", avgViews: { $avg: "$views" }, avgLikes: { $avg: { $size: "$likes" } } } },
      { $sort: { avgViews: -1 } }
    ]);

    // 3. Most active users (by comments and likes)
    const topUsers = await GhazalModel.aggregate([
      { $unwind: "$comments" },
      { $group: { _id: "$comments.user", commentCount: { $sum: 1 } } },
      { $sort: { commentCount: -1 } },
      { $limit: 5 },
      { $lookup: { from: "useraccounts", localField: "_id", foreignField: "_id", as: "user" } },
      { $project: { user: { $arrayElemAt: ["$user.firstname", 0] }, commentCount: 1 } }
    ]);

    // 4. Content distribution (number of pieces by kalam type)
    const contentDistribution = [
      { type: "Ghazal", count: ghazalCount },
      { type: "Shair", count: shairCount },
      { type: "Nazm", count: nazmCount },
      { type: "Qata", count: qataCount },
    ];

    // H. BUILD THE DYNAMIC SYSTEM PROMPT (enriched)
    const statsText = `
📊 **PLATFORM OVERVIEW**
- Total Ghazals: ${ghazalCount}
- Total Shairs: ${shairCount}
- Total Nazms: ${nazmCount}
- Total Qatas: ${qataCount}
- Registered Users: ${userCount}
- Distinct Commenters: ${totalDistinctCommenters}
- Active Users (last 30 days): ${activeUsersLast30Days}
- Average Content Age (days): ${Math.round(await GhazalModel.aggregate([{ $group: { _id: null, avgAge: { $avg: { $dateDiff: { startDate: "$createdAt", endDate: new Date(), unit: "day" } } } } }]).then(r => r[0]?.avgAge || 0))}

📈 **ENGAGEMENT METRICS (GHAZAL)**
- Total Views: ${ghazalMetrics.totalViews}
- Average Views: ${Math.round(ghazalMetrics.avgViews)}
- Total Likes: ${ghazalMetrics.totalLikes}
- Average Likes: ${ghazalMetrics.avgLikes.toFixed(1)}
- Total Comments: ${ghazalMetrics.totalComments}
- Average Comments: ${ghazalMetrics.avgComments.toFixed(1)}

📈 **ENGAGEMENT METRICS (OTHER)**
Shairs – Avg Views: ${Math.round(shairMetrics.avgViews)}, Avg Likes: ${shairMetrics.avgLikes.toFixed(1)}, Avg Comments: ${shairMetrics.avgComments.toFixed(1)}
Nazms – Avg Views: ${Math.round(nazmMetrics.avgViews)}, Avg Likes: ${nazmMetrics.avgLikes.toFixed(1)}, Avg Comments: ${nazmMetrics.avgComments.toFixed(1)}
Qatas – Avg Views: ${Math.round(qataMetrics.avgViews)}, Avg Likes: ${qataMetrics.avgLikes.toFixed(1)}, Avg Comments: ${qataMetrics.avgComments.toFixed(1)}

🏆 **TOP 5 MOST VIEWED GHAZALS**
${ghazalMetrics.topViewed.map((g, i) => `${i+1}. "${g.firstLine}" by ${g.takhallus} – ${g.views} views`).join('\n')}

🏆 **TOP 5 MOST LIKED GHAZALS**
${ghazalMetrics.topLiked.map((g, i) => `${i+1}. "${g.firstLine}" by ${g.takhallus} – ${g.likes} likes`).join('\n')}

💬 **MOST COMMENTED GHAZAL**
${ghazalMetrics.topCommented ? `"${ghazalMetrics.topCommented.firstLine}" by ${ghazalMetrics.topCommented.takhallus} – ${ghazalMetrics.topCommented.commentsCount} comments` : 'N/A'}

📂 **CATEGORY PERFORMANCE (GHAZAL)**
${categoryPerformance.map(c => `  - ${c._id}: avg views ${Math.round(c.avgViews)}, avg likes ${c.avgLikes.toFixed(1)}`).join('\n')}

🏅 **TOP POETS (by total views across ghazals)**
${topPoets.map((p, i) => `${i+1}. ${p._id} – ${p.totalViews} views, ${p.totalLikes} likes, ${p.totalComments} comments`).join('\n')}

👤 **TOP USERS (by comment count)**
${topUsers.map((u, i) => `${i+1}. ${u.user || 'Unknown'} – ${u.commentCount} comments`).join('\n')}

📆 **MONTHLY TRENDS (last 6 months)**
Ghazal Creation:
${ghazalMetrics.monthlyTrends.map(m => `  ${m._id.year}-${String(m._id.month).padStart(2,'0')}: ${m.count} new, ${m.totalViews} views`).join('\n')}
User Signups:
${userSignupsMonthly.map(m => `  ${m._id.year}-${String(m._id.month).padStart(2,'0')}: ${m.count} new users`).join('\n')}

📅 **WEEKLY PATTERNS (GHAZAL)**
Views by day of week (1=Sun):
${weeklyGhazalViews.map(w => `  Day ${w._id.dayOfWeek}: ${w.totalViews} views`).join('\n')}
Comments by day of week:
${weeklyComments.map(w => `  Day ${w._id.dayOfWeek}: ${w.totalComments} comments`).join('\n')}
Best day for views: Day ${weeklyGhazalViews.sort((a,b) => b.totalViews - a.totalViews)[0]?._id.dayOfWeek || 'N/A'}

⚠️ **ANOMALY DETECTION**
Views threshold (mean + 2σ): ${Math.round(anomalyThreshold)}
Anomalous ghazals (above threshold):
${anomalousGhazals.map(g => `  - "${g.firstLine}" by ${g.takhallus} – ${g.views} views`).join('\n') || '  None'}

🔮 **PREDICTIVE TRENDS**
- Ghazal views next month (linear forecast): ~${nextMonthViews} views
- New user signups next month (linear forecast): ~${nextMonthUsers} new users
- Current view growth slope: ${viewSlope.toFixed(1)} views/month
- User growth slope: ${userSlope.toFixed(1)} users/month
`;

    const systemPrompt = ADMIN_ASSISTANT_BASE + statsText + `

YOUR ROLE:
- Answer questions about any of the above data.
- Interpret trends – explain why they might be happening.
- Provide actionable recommendations based on patterns.
- If asked about a specific ghazal, shair, nazm, or qata that isn't in the top lists, you can say you don't have that data but offer to help with what you do have.
- For predictions, mention that they are linear extrapolations and may be affected by external factors.
- Always be professional and data‑driven.`;

    // I. CALL GROQ – FULLY DYNAMIC MODEL SELECTION (NO STATIC FALLBACK)
    const systemMessage = { role: "system", content: systemPrompt };
    const chatMessages = [systemMessage, ...messages];
    const config = getGroqConfig("chat");

    let availableModels: string[] = [];
    try {
      availableModels = await getAvailableModels();
    } catch (error) {
      console.error("Failed to fetch models:", error);
      // If fetch fails, we can still try a very small fallback – but we want to avoid static lists.
      // Instead, we'll let the user know the service is unavailable.
      return NextResponse.json(
        {
          success: false,
          message: "Could not retrieve available models. Please check your Groq API key.",
          err: "MODEL_FETCH_ERROR",
        },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    // If the API returned an empty list, that means no models are available (invalid key or service issue)
    if (availableModels.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No models available for your API key. Please check your Groq plan.",
          err: "NO_MODELS",
        },
        { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
      );
    }

    // Filter out non‑chat models (guard, whisper, safeguard)
    const excludePatterns = /prompt-guard|whisper|safeguard/i;
    const chatModels = availableModels.filter(id => !excludePatterns.test(id));

    // Priority scoring (higher score = better)
    const priorityKeywords = [
      { keyword: '120b', score: 100 },
      { keyword: '20b', score: 80 },
      { keyword: 'qwen', score: 70 },
      { keyword: 'compound', score: 60 },
      { keyword: 'allam', score: 50 },
    ];

    const scored = chatModels.map(id => {
      let score = 0;
      for (const { keyword, score: s } of priorityKeywords) {
        if (id.toLowerCase().includes(keyword)) score += s;
      }
      return { id, score };
    });
    scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    const finalModels = scored.map(m => m.id);

    // If no chat models remain, fallback to all models (but exclude guard/whisper already excluded)
    if (finalModels.length === 0) {
      finalModels.push(...availableModels);
    }

    let stream;
    let lastError: any;

    for (const model of finalModels) {
      try {
        console.log(`🔍 Trying model: ${model}`);
        stream = await groq.chat.completions.create({
          model: model,
          messages: chatMessages,
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          top_p: config.topP,
          frequency_penalty: config.frequencyPenalty,
          presence_penalty: config.presencePenalty,
          stream: true,
        });
        break;
      } catch (err: any) {
        const isMaxTokensError =
          err?.error?.param === 'max_tokens' ||
          err?.message?.includes('max_tokens') ||
          err?.error?.message?.includes('max_tokens');

        if (isMaxTokensError) {
          try {
            console.log(`🔄 Retrying ${model} with max_tokens=512`);
            stream = await groq.chat.completions.create({
              model: model,
              messages: chatMessages,
              temperature: config.temperature,
              max_tokens: 512,
              top_p: config.topP,
              frequency_penalty: config.frequencyPenalty,
              presence_penalty: config.presencePenalty,
              stream: true,
            });
            console.log(`${model} succeeded with 512 tokens!`);
            break;
          } catch (retryErr: any) {
            console.warn(`❌ Retry failed:`, retryErr.message);
            lastError = retryErr;
            continue;
          }
        } else {
          console.warn(`Model ${model} failed:`, err.message);
          lastError = err;
          // Stop on non-model errors (e.g., network, auth)
          const isModelError =
            err?.error?.code === 'model_not_found' ||
            err?.error?.code === 'model_decommissioned' ||
            err?.status === 400 ||
            err?.status === 404;
          if (!isModelError) break;
        }
      }
    }

    if (!stream) {
      console.error("All models failed. Last error:", lastError);
      return NextResponse.json(
        {
          success: false,
          message: "AI service is temporarily unavailable. Please try again later.",
          err: "AI_UNAVAILABLE",
        },
        { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
      );
    }

    // J. STREAM RESPONSE (unchanged)
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new NextResponse(readableStream, {
      status: HTTP_STATUS.OK,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("AI Chat Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to process chat request",
        data: null,
        err: "AI_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}