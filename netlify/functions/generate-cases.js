// netlify/functions/generate-cases.js
//
// Server-side proxy to the Claude API. The Anthropic API key lives ONLY in
// Netlify's environment variables (Site settings -> Environment variables ->
// ANTHROPIC_API_KEY) and is never sent to or readable by the browser. This
// replaces the old approach of putting the key directly in client-side HTML.

const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are a senior QA architect who specializes in capital markets and BFSI trading platforms — Order Management Systems (OMS), Risk Management Systems (RMS), Beginning/End-of-Day (BOD/EOD) batch processing, and multi-exchange trading across NSE, BSE, and MCX, spanning Equity Cash, Futures & Options, Currency, and Commodity segments.

You design test cases the way an experienced capital-markets QA engineer would — grounded in how these systems actually behave and fail in production, not generic app-testing boilerplate.

When the feature description relates to trading, orders, risk, or back-office processing, ground the test cases in real domain mechanics such as:
- Order routing across exchange/segment gateways, order modification and time-priority rules, partial fills
- Price band / circuit limit validation, exchange-level and client-level exposure and margin checks
- Real-time MTM calculation, auto square-off, risk manager overrides
- BOD/EOD sequences: contract master load, margin file and closing-price reconciliation, position carry-forward, circuit limit refresh, SLA timing, trading-enable gating
- Multi-exchange price feed sync, latency/deviation thresholds, feed failover, smart order routing, exchange holiday calendars
- Corporate actions, settlement cycles, and audit-trail/compliance logging requirements

If the feature described is generic (e.g. login, a dashboard widget, a settings screen) with no trading-specific angle, write high-quality standard QA test cases instead — do not force irrelevant trading jargon into unrelated features.

Return ONLY a valid JSON array — no markdown fences, no commentary, no leading or trailing text. Each element must have exactly this shape:
{
  "title": string (specific, testable, under 100 characters),
  "type": one of the requested test types, exactly as given,
  "priority": "High" | "Medium" | "Low",
  "riskTier": "High" | "Medium" | "Low" — the business/trading risk if this scenario fails in production,
  "preconditions": string,
  "steps": array of 4-6 short, concrete, imperative steps,
  "expected": string describing the precise expected system behavior,
  "impactedArea": string — comma-separated systems/modules this touches
}

Distribute the requested count evenly across the requested test types. Do not repeat the same title twice.`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured on server' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { desc, module, types, count, impacted, notes, project, env } = payload;
  if (!desc || !Array.isArray(types) || !types.length || !count) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }
  const safeCount = Math.max(1, Math.min(Number(count) || 5, 20));

  const userMessage = `Feature/requirement description: ${desc}
Module: ${module || 'General'}
${project ? `Platform/project: ${project}\n` : ''}${env ? `Test environment: ${env}\n` : ''}${impacted ? `Impacted area (if already known): ${impacted}\n` : ''}${notes ? `Additional notes: ${notes}\n` : ''}
Requested test types: ${types.join(', ')}
Total test cases to generate: ${safeCount}

Return the JSON array now.`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: Math.min(4096, 400 + safeCount * 220),
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      return { statusCode: 502, body: JSON.stringify({ error: 'Claude API error', detail: errText.slice(0, 500) }) };
    }

    const data = await resp.json();
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    // Be defensive about parsing: strip accidental code fences, then grab the
    // outermost [ ... ] in case the model added any stray text around it.
    let jsonText = text.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    const start = jsonText.indexOf('[');
    const end = jsonText.lastIndexOf(']');
    if (start === -1 || end === -1 || end < start) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Could not parse model response' }) };
    }
    jsonText = jsonText.slice(start, end + 1);

    let cases;
    try {
      cases = JSON.parse(jsonText);
    } catch (e) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Malformed JSON from model' }) };
    }
    if (!Array.isArray(cases) || !cases.length) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Empty case list from model' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ cases }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error', detail: String(e).slice(0, 300) }) };
  }
};
