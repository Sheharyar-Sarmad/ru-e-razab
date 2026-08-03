// app/api/client/kulliyat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import NazmModel from "@/models/kalam/nazm.model";
import GhazalModel from "@/models/kalam/ghazals.model";
import QataModel from "@/models/kalam/qata.model";

export async function GET(request: NextRequest) {
  try {
    await ConnectDB(EnvSecrets.mongoUri as string);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "9");
    const type = searchParams.get("type") || ""; // nazm, ghazal, qata, all
    const search = searchParams.get("search") || "";

    // Build queries
    let nazmQuery: any = {};
    let ghazalQuery: any = {};
    let qataQuery: any = {};

    // Apply search filter (only search, no poet filter since it's single poet)
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      
      nazmQuery.$or = [
        { unwan: searchRegex },
        { "content.shairs.lines": searchRegex },
        { metaTitle: searchRegex },
        { metaDescription: searchRegex },
      ];
      
      ghazalQuery.$or = [
        { "content.lines": searchRegex },
        { metaTitle: searchRegex },
        { metaDescription: searchRegex },
      ];
      
      qataQuery.$or = [
        { "content.lines": searchRegex },
        { metaTitle: searchRegex },
        { metaDescription: searchRegex },
      ];
    }

    // Determine which types to fetch
    let fetchNazm = type === "" || type === "all" || type === "nazm";
    let fetchGhazal = type === "" || type === "all" || type === "ghazal";
    let fetchQata = type === "" || type === "all" || type === "qata";

    // Fetch all types in parallel
    const [nazms, ghazals, qatas] = await Promise.all([
      fetchNazm 
        ? NazmModel.find(nazmQuery)
            .select("unwan takhallus slug content category coverImage likes comments createdAt")
            .lean()
        : [],
      fetchGhazal
        ? GhazalModel.find(ghazalQuery)
            .select("takhallus slug content category coverImage likes comments createdAt")
            .lean()
        : [],
      fetchQata
        ? QataModel.find(qataQuery)
            .select("takhallus slug content category coverImage likes comments createdAt")
            .lean()
        : [],
    ]);

    // Format each type with proper structure
    const formattedNazms = nazms.map((item: any) => {
      // Get first line for preview
      let firstLine = "";
      if (item.content && item.content.length > 0) {
        const firstBand = item.content[0];
        if (firstBand && firstBand.shairs && firstBand.shairs.length > 0) {
          const firstShair = firstBand.shairs[0];
          if (firstShair && firstShair.lines && firstShair.lines.length > 0) {
            firstLine = firstShair.lines[0] || "";
          }
        }
      }

      return {
        _id: item._id,
        type: "nazm",
        typeDisplay: "Nazm",
        title: item.unwan || "Untitled",
        slug: item.slug,
        firstLine: firstLine,
        category: item.category || [],
        coverImage: item.coverImage || "",
        likesCount: item.likes?.length || 0,
        commentsCount: item.comments?.length || 0,
        createdAt: item.createdAt,
      };
    });

    const formattedGhazals = ghazals.map((item: any) => {
      // Get first line for preview
      let firstLine = "";
      if (item.content && item.content.length > 0) {
        const firstShair = item.content[0];
        if (firstShair && firstShair.lines && firstShair.lines.length > 0) {
          firstLine = firstShair.lines[0] || "";
        }
      }

      return {
        _id: item._id,
        type: "ghazal",
        typeDisplay: "Ghazal",
        title: "Ghazal",
        slug: item.slug,
        firstLine: firstLine,
        category: item.category || [],
        coverImage: item.coverImage || "",
        likesCount: item.likes?.length || 0,
        commentsCount: item.comments?.length || 0,
        createdAt: item.createdAt,
      };
    });

    const formattedQatas = qatas.map((item: any) => {
      // Get first line for preview
      let firstLine = "";
      if (item.content && item.content.length > 0) {
        const firstShair = item.content[0];
        if (firstShair && firstShair.lines && firstShair.lines.length > 0) {
          firstLine = firstShair.lines[0] || "";
        }
      }

      return {
        _id: item._id,
        type: "qata",
        typeDisplay: "Qata",
        title: "Qata",
        slug: item.slug,
        firstLine: firstLine,
        category: item.category || [],
        coverImage: item.coverImage || "",
        likesCount: item.likes?.length || 0,
        commentsCount: item.comments?.length || 0,
        createdAt: item.createdAt,
      };
    });

    // Combine all poetry
    let allPoetry = [...formattedNazms, ...formattedGhazals, ...formattedQatas];

    // Shuffle randomly (Fisher-Yates algorithm)
    function shuffleArray<T>(array: T[]): T[] {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }

    allPoetry = shuffleArray(allPoetry);

    // Pagination
    const total = allPoetry.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginated = allPoetry.slice(startIndex, endIndex);

    const typeCounts = {
      nazm: formattedNazms.length,
      ghazal: formattedGhazals.length,
      qata: formattedQatas.length,
    };

    return NextResponse.json(
      {
        success: true,
        message: "Kulliyat fetched successfully (کلیات حاصل ہوگئی)",
        data: {
          poetry: paginated,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNext: endIndex < total,
            hasPrev: page > 1,
            nextPage: endIndex < total ? page + 1 : null,
            prevPage: page > 1 ? page - 1 : null,
            showing: `${startIndex + 1}-${Math.min(endIndex, total)} of ${total}`,
          },
          stats: {
            total: total,
            byType: typeCounts,
          },
        },
        err: null,
        status: HTTP_STATUS.OK,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error("Kulliyat Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch Kulliyat (کلیات حاصل نہیں ہو سکی)",
        data: null,
        err: "FETCH_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}