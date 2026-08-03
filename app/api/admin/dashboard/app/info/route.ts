// app/api/admin/dashboard/stats/route.ts
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

    // FETCH ALL COUNTS IN PARALLEL

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
      topPoets,
      categoryStats,
      newUsersThisWeek,
      newPoetryThisWeek,
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
      
      // 7. Active Users (users who have commented or liked)
      UserAccountModel.countDocuments({
        $or: [
          { "comments": { $exists: true, $ne: [] } },
          { "likes": { $exists: true, $ne: [] } },
        ],
      }),
      
      // 8. Total Poetry (all categories combined)
      Promise.all([
        GhazalModel.countDocuments(),
        ShairModel.countDocuments(),
        QataModel.countDocuments(),
        NazmModel.countDocuments(),
      ]).then(([g, s, q, n]) => g + s + q + n),
      
      // 9. Recent Ghazals (last 5)
      GhazalModel.find()
        .select("takhallus slug metaTitle createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      
      // 10. Recent Shairs (last 5)
      ShairModel.find()
        .select("takhallus slug metaTitle createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      
      // 11. Recent Qatas (last 5)
      QataModel.find()
        .select("takhallus slug metaTitle createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      
      // 12. Recent Nazms (last 5)
      NazmModel.find()
        .select("takhallus slug metaTitle createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      
      // 13. Top Poets (by total contributions)
      Promise.all([
        GhazalModel.aggregate([
          { $group: { _id: "$takhallus", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ]),
        ShairModel.aggregate([
          { $group: { _id: "$takhallus", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ]),
        QataModel.aggregate([
          { $group: { _id: "$takhallus", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ]),
        NazmModel.aggregate([
          { $group: { _id: "$takhallus", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ]),
      ]).then(([ghazalPoets, shairPoets, qataPoets, nazmPoets]) => {
        const poetMap = new Map();
        [...ghazalPoets, ...shairPoets, ...qataPoets, ...nazmPoets].forEach((p) => {
          if (p._id) {
            poetMap.set(p._id, (poetMap.get(p._id) || 0) + p.count);
          }
        });
        return Array.from(poetMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
      }),
      
      // 14. Category Stats (breakdown by category)
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
      
      // 15. New users this week
      UserAccountModel.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      
      // 16. New poetry this week
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
        
        // Category Stats
        categories: categoryStats,
        
        // 🏆 Top Poets
        topPoets,
        
        // Recent Additions
        recent: {
          ghazals: recentGhazals,
          shairs: recentShairs,
          qatas: recentQatas,
          nazms: recentNazms,
        },
        
        // ⏱Meta
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