import { getStore } from "@netlify/blobs";

const CORS = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
const EMPTY = { testCases: [], sprints: {}, sanitySuites: [], results: {}, logs: [], lastSaved: null };

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
  if (req.method !== "GET") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS });

  try {
    const store = getStore({ name: "qaforge-data", consistency: "strong" });
    const data = await store.get("workspace", { type: "json" });
    return new Response(JSON.stringify(data ?? EMPTY), { status: 200, headers: CORS });
  } catch (err) {
    console.error("db-load error:", err.message);
    return new Response(JSON.stringify(EMPTY), { status: 200, headers: CORS });
  }
};

export const config = { path: "/api/db/load" };
