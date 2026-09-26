// db/connect.db.ts
import mongoose, { Mongoose } from "mongoose";

  //  GLOBAL SINGLETON
  //  Survives Next.js hot-reload in dev (prevents pool leaks)
  //  and works across API routes in prod (per Node process).

interface MongoGlobal {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
  lastError: Error | null;
  retryCount: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __mongoGlobal: MongoGlobal | undefined;
}

const globalCache: MongoGlobal =
  global.__mongoGlobal ??
  (global.__mongoGlobal = {
    conn: null,
    promise: null,
    lastError: null,
    retryCount: 0,
  });

  //  CONNECTION OPTIONS — tuned for Next.js + Atlas

const MONGO_OPTIONS: mongoose.ConnectOptions = {
  // ---- Pool ----
  // Small pool is faster to establish and enough for a single-poet site.
  // Increase maxPoolSize only if you see "connection pool exhausted" errors.
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 60_000,

  // ---- Timeouts — fail fast ----
  serverSelectionTimeoutMS: 8_000,  // how long to find a primary
  socketTimeoutMS: 20_000,          // per-query timeout
  connectTimeoutMS: 10_000,         // TCP handshake
  waitQueueTimeoutMS: 10_000,       // how long a query waits for a free socket

  // ---- Reliability ----
  retryWrites: true,
  retryReads: true,

  // ---- Atlas TLS ----
  // (auto-handled when using mongodb+srv:// URIs)

  // ---- Misc ----
  autoIndex: false,   // disable — you already define indexes in your schemas
  autoCreate: false,  // never let the app create collections
};

/* =========================================================
   CONNECT (fast path + promise dedupe + retry)
========================================================= */

export async function ConnectDB(mongoUri: string): Promise<Mongoose> {
  // 1. Already connected → return instantly (< 1 µs)
  if (globalCache.conn && mongoose.connection.readyState === 1) {
    return globalCache.conn;
  }

  // 2. Connection already in-flight → await it, don't spawn another
  if (globalCache.promise) {
    try {
      return await globalCache.promise;
    } catch {
      // Fall through to retry below
    }
  }

  // 3. Cold start — build the connection once
  globalCache.promise = mongoose
    .connect(mongoUri, MONGO_OPTIONS)
    .then((m) => {
      globalCache.conn = m;
      globalCache.lastError = null;
      globalCache.retryCount = 0;

      // ---- Wire event handlers (only once) ----
      if (!(mongoose.connection as any).__wired) {
        (mongoose.connection as any).__wired = true;

        mongoose.connection.on("disconnected", () => {
          console.warn("[mongo] disconnected");
          globalCache.conn = null;
          globalCache.promise = null;
        });

        mongoose.connection.on("reconnected", () => {
          console.log("[mongo] reconnected");
          globalCache.retryCount = 0;
        });

        mongoose.connection.on("error", (err) => {
          console.error("[mongo] error:", err.message);
          globalCache.lastError = err;
          // Let the next call attempt a fresh connection
          globalCache.conn = null;
          globalCache.promise = null;
        });
      }

      return m;
    })
    .catch((err: Error) => {
      globalCache.lastError = err;
      globalCache.promise = null;
      globalCache.retryCount++;
      throw err;
    });

  try {
    return await globalCache.promise;
  } catch (err) {
    // Retry once after a short delay on transient errors
    if (globalCache.retryCount <= 2 && isTransient(err)) {
      await sleep(400 * globalCache.retryCount);
      return ConnectDB(mongoUri);
    }
    throw err;
  }
}

/* HELPERS */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isTransient(err: any): boolean {
  const name = err?.name || "";
  const code = err?.code || "";
  const labels: Set<string> = err?.errorLabelSet ?? new Set();

  return (
    name === "MongoServerSelectionError" ||
    name === "MongoNetworkError" ||
    name === "MongoNetworkTimeoutError" ||
    name === "MongooseServerSelectionError" ||
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    labels.has("RetryableError") ||
    labels.has("ResetPool")
  );
}

// HEALTH CHECK (optional)

export function getConnectionState():
  | "disconnected"
  | "connected"
  | "connecting"
  | "disconnecting"
  | "uninitialized" {
  const states = [
    "disconnected",
    "connected",
    "connecting",
    "disconnecting",
    "uninitialized",
  ] as const;
  return states[mongoose.connection.readyState] ?? "uninitialized";
}

export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}