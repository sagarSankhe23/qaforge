import { getStore } from "@netlify/blobs";

export default async (req) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers }); }

  try {
    const store = getStore({ name: "qaforge-data", consistency: "strong" });
    await store.setJSON("workspace", { ...body, lastSaved: new Date().toISOString() });
    return new Response(JSON.stringify({ ok: true, savedAt: new Date().toISOString() }), { status: 200, headers });
  } catch (err) {
    console.error("Blobs save error:", err);
    return new Response(JSON.stringify({ error: "Save failed: " + err.message }), { status: 500, headers });
  }
};

export const config = { path: "/api/db/save" };
