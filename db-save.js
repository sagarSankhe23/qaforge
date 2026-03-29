import { getStore } from "@netlify/blobs";

const CORS = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS });

  try {
    const body = await req.json();
    const store = getStore({ name: "qaforge-data", consistency: "strong" });
    await store.setJSON("workspace", { ...body, lastSaved: new Date().toISOString() });
    return new Response(JSON.stringify({ ok: true, savedAt: new Date().toISOString() }), { status: 200, headers: CORS });
  } catch (err) {
    console.error("db-save error:", err.message);
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: CORS });
  }
};

export const config = { path: "/api/db/save" };
