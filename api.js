// QA Forge - All-in-one serverless function
// Handles: /api/generate (Claude AI), /api/db/save, /api/db/load, /api/db/reset
// Zero npm dependencies - uses Netlify Blobs via built-in runtime context

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

// ── Netlify Blobs via runtime context (no npm needed) ──
function getBlobsClient() {
  const ctx = process.env.NETLIFY_BLOBS_CONTEXT;
  if (!ctx) return null;
  try {
    const { apiURL, token, siteID } = JSON.parse(
      Buffer.from(ctx, "base64").toString("utf-8")
    );
    const base = `${apiURL}/api/v1/blobs/${siteID}/qaforge-data`;
    return {
      async get(key) {
        const r = await fetch(`${base}/${key}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`Blobs GET failed: ${r.status}`);
        return r.json();
      },
      async set(key, value) {
        const r = await fetch(`${base}/${key}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(value),
        });
        if (!r.ok) throw new Error(`Blobs PUT failed: ${r.status}`);
      },
    };
  } catch (e) {
    console.error("Blobs context parse error:", e.message);
    return null;
  }
}

const EMPTY_DB = {
  testCases: [],
  sprints: {},
  sanitySuites: [],
  results: {},
  logs: [],
  lastSaved: null,
};

export default async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  // ── /api/db/load ──
  if (path === "/api/db/load" && req.method === "GET") {
    try {
      const blobs = getBlobsClient();
      if (!blobs) {
        console.log("Blobs context not available");
        return json(EMPTY_DB);
      }
      const data = await blobs.get("workspace");
      return json(data || EMPTY_DB);
    } catch (err) {
      console.error("Load error:", err.message);
      return json(EMPTY_DB);
    }
  }

  // ── /api/db/save ──
  if (path === "/api/db/save" && req.method === "POST") {
    try {
      const body = await req.json();
      const blobs = getBlobsClient();
      if (!blobs) return json({ ok: false, error: "Blobs not available" }, 503);
      await blobs.set("workspace", { ...body, lastSaved: new Date().toISOString() });
      return json({ ok: true, savedAt: new Date().toISOString() });
    } catch (err) {
      console.error("Save error:", err.message);
      return json({ ok: false, error: err.message }, 500);
    }
  }

  // ── /api/db/reset ──
  if (path === "/api/db/reset" && req.method === "POST") {
    try {
      const blobs = getBlobsClient();
      if (!blobs) return json({ ok: false, error: "Blobs not available" }, 503);
      await blobs.set("workspace", { ...EMPTY_DB, lastSaved: new Date().toISOString() });
      return json({ ok: true });
    } catch (err) {
      return json({ ok: false, error: err.message }, 500);
    }
  }

  // ── /api/generate (Claude AI) ──
  if (path === "/api/generate" && req.method === "POST") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return json({ error: "ANTHROPIC_API_KEY not set on server" }, 500);
    }
    try {
      const body = await req.json();
      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });
      const data = await upstream.json();
      return json(data, upstream.status);
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }

  return json({ error: "Not found" }, 404);
};

export const config = {
  path: ["/api/generate", "/api/db/load", "/api/db/save", "/api/db/reset"],
};
