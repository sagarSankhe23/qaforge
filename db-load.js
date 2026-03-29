import { getStore } from "@netlify/blobs";

export default async (req) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "GET") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });

  const empty = { testCases: [], sprints: {}, sanitySuites: [], results: {}, logs: [], lastSaved: null };

  try {
    const store = getStore({ name: "qaforge-data", consistency: "strong" });
    const data = await store.get("workspace", { type: "json" });
    return new Response(JSON.stringify(data || empty), { status: 200, headers });
  } catch (err) {
    console.error("Blobs load error:", err);
    // Return empty instead of error — app falls back to local gracefully
    return new Response(JSON.stringify(empty), { status: 200, headers });
  }
};

export const config = { path: "/api/db/load" };
