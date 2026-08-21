// app/api/admin/dashboard/app/info/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import UserAccountModel from "@/models/auth/user.account.model";
import AdminAccountModel from "@/models/auth/admin.account.model";
import GhazalModel from "@/models/kalam/ghazals.model";
import ShairModel from "@/models/kalam/shair.model";
import QataModel from "@/models/kalam/qata.model";
import NazmModel from "@/models/kalam/nazm.model";

// CACHE
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

// GET - Dashboard Statistics
export async function GET(request: NextRequest) {
  const startTime = performance.now();

  try {
    // Connect to database
    await ConnectDB(EnvSecrets.mongoUri as string);

    // CHECK CACHE
    const cacheKey = "dashboard-stats";
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("Cache HIT for dashboard stats");
      return NextResponse.json(cached.data, {
        status: HTTP_STATUS.OK,
        headers: {
          "X-Response-Time": `${(performance.now() - startTime).toFixed(2)}ms`,
          "X-Cache": "HIT",
        },
      });
    }

    console.log("Cache MISS for dashboard stats");

    // Helper: Get Weekly Activity (Count poetry per day of week for last 7 days)
    const getWeeklyActivity = async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);

      const aggregateByDay = async (model: any) => {
        return model.aggregate([
          { $match: { createdAt: { $gte: sevenDaysAgo } } },
          {
            $group: {
              _id: { $dayOfWeek: "$createdAt" }, // 1=Sun, 7=Sat
              count: { $sum: 1 },
            },
          },
        ]);
      };

      const [g, s, q, n] = await Promise.all([
        aggregateByDay(GhazalModel),
        aggregateByDay(ShairModel),
        aggregateByDay(QataModel),
        aggregateByDay(NazmModel),
      ]);

      const dayMap = new Map();
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      // Initialize map with zeros
      for (let i = 1; i <= 7; i++) dayMap.set(i, 0);

      [...g, ...s, ...q, ...n].forEach((item) => {
        if (item._id >= 1 && item._id <= 7) {
          dayMap.set(item._id, (dayMap.get(item._id) || 0) + item.count);
        }
      });

      return Array.from(dayMap.entries()).map(([id, count]) => ({
        day: dayNames[id - 1],
        count,
      }));
    };

    // FETCH ALL DATA IN PARALLEL (Top Poets completely removed)
    const [
      totalUsers,
      totalAdmins,
      totalGhazals,
      totalShairs,
      totalQatas,
      totalNazms,
      activeUsers,
      totalPoetry,
      recentGhazals,
      recentShairs,
      recentQatas,
      recentNazms,
      categoryBreakdown,
      newUsersThisWeek,
      newPoetryThisWeek,
      weeklyActivity,
    ] = await Promise.all([
      // 1. Total Users
      UserAccountModel.countDocuments(),

      // 2. Total Admins
      AdminAccountModel.countDocuments(),

      // 3. Total Ghazals
      GhazalModel.countDocuments(),

      // 4. Total Shairs
      ShairModel.countDocuments(),

      // 5. Total Qatas
      QataModel.countDocuments(),

      // 6. Total Nazms
      NazmModel.countDocuments(),

      // 7. Active Users
      UserAccountModel.countDocuments({
        $or: [
          { "comments": { $exists: true, $ne: [] } },
          { "likes": { $exists: true, $ne: [] } },
        ],
      }),

      // 8. Total Poetry
      Promise.all([
        GhazalModel.countDocuments(),
        ShairModel.countDocuments(),
        QataModel.countDocuments(),
        NazmModel.countDocuments(),
      ]).then(([g, s, q, n]) => g + s + q + n),

      // 9. Recent Ghazals
      GhazalModel.find()
        .select("takhallus slug metaTitle createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // 10. Recent Shairs
      ShairModel.find()
        .select("takhallus slug metaTitle createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // 11. Recent Qatas
      QataModel.find()
        .select("takhallus slug metaTitle createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // 12. Recent Nazms
      NazmModel.find()
        .select("takhallus slug metaTitle createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // 13. Category Distribution (by genre)
      Promise.all([
        GhazalModel.aggregate([
          { $unwind: "$category" },
          { $group: { _id: "$category", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        ShairModel.aggregate([
          { $unwind: "$category" },
          { $group: { _id: "$category", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        QataModel.aggregate([
          { $unwind: "$category" },
          { $group: { _id: "$category", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        NazmModel.aggregate([
          { $unwind: "$category" },
          { $group: { _id: "$category", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
      ]).then(([g, s, q, n]) => {
        const catMap = new Map();
        [...g, ...s, ...q, ...n].forEach((c) => {
          if (c._id) {
            catMap.set(c._id, (catMap.get(c._id) || 0) + c.count);
          }
        });
        return Array.from(catMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
      }),

      // 14. New users this week
      UserAccountModel.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),

      // 15. New poetry this week
      Promise.all([
        GhazalModel.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }),
        ShairModel.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }),
        QataModel.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }),
        NazmModel.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }),
      ]).then(([g, s, q, n]) => g + s + q + n),

      // 16. Weekly Activity
      getWeeklyActivity(),
    ]);

    const responseTime = performance.now() - startTime;

    // BUILD RESPONSE
    const responseData = {
      success: true,
      message: "Dashboard statistics fetched successfully",
      data: {
        // Users
        users: {
          total: totalUsers,
          active: activeUsers,
          admins: totalAdmins,
          newThisWeek: newUsersThisWeek,
        },

        // Poetry Overview
        poetry: {
          total: totalPoetry,
          newThisWeek: newPoetryThisWeek,
          breakdown: {
            ghazals: totalGhazals,
            shairs: totalShairs,
            qatas: totalQatas,
            nazms: totalNazms,
          },
        },

        // Category Distribution (Genre)
        categories: categoryBreakdown,

        // Weekly Activity (Last 7 days)
        weeklyActivity: weeklyActivity,

        // Recent Additions
        recent: {
          ghazals: recentGhazals,
          shairs: recentShairs,
          qatas: recentQatas,
          nazms: recentNazms,
        },

        // Meta
        meta: {
          responseTime: `${responseTime.toFixed(2)}ms`,
          timestamp: new Date().toISOString(),
        },
      },
      err: null,
      status: HTTP_STATUS.OK,
    };

    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now(),
    });

    return NextResponse.json(responseData, {
      status: HTTP_STATUS.OK,
      headers: {
        "X-Response-Time": `${responseTime.toFixed(2)}ms`,
        "X-Cache": "MISS",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch dashboard statistics",
        data: null,
        err: "FETCH_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}