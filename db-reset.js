import { getStore } from "@netlify/blobs";

const CORS = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

export default async (req) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS });

  try {
    const store = getStore({ name: "qaforge-data", consistency: "strong" });
    await store.setJSON("workspace", { testCases: [], sprints: {}, sanitySuites: [], results: {}, logs: [], lastSaved: new Date().toISOString() });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: CORS });
  }
};

export const config = { path: "/api/db/reset" };
