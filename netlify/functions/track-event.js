// netlify/functions/track-event.js
//
// Event tracker for qaforge.netlify.app — tracks the 4 events that matter:
//   - try-it-live      (visitor opened the live demo)
//   - create-testcase  (visitor actually created a test case)
//   - send-feedback    (visitor sent feedback)
//   - about-qaforge    (visitor clicked "About QA Forge")
//
// Captures city/region/country via Netlify's built-in context.geo (free,
// no external API) and browser/OS/device from the User-Agent header.
// No IP address is stored. All counters live in one JSON blob for
// strongly-consistent reads (same fix applied to the other 2 sites).

import { getStore } from '@netlify/blobs';
import { parseUserAgent } from './ua-parser.js';

const ALLOWED_EVENTS = new Set([
  'try-it-live',
  'create-testcase',
  'send-feedback',
  'about-qaforge',
]);

const MAX_LOG_ENTRIES = 300;

export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { event, ...extra } = body || {};

  if (!ALLOWED_EVENTS.has(event)) {
    return new Response(JSON.stringify({ error: 'Unknown event' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const store = getStore('qaforge-analytics');

  const detailEntries = Object.entries(extra).filter(([, v]) => typeof v === 'string' && v.trim());
  const counterKeys = [event, ...detailEntries.map(([k, v]) => `${event}:${k}:${v}`)];
  await incrementCounters(store, counterKeys);

  const geo = context.geo || {};
  const ua = req.headers.get('user-agent') || '';
  const device = parseUserAgent(ua);

  const logEntry = {
    event,
    detail: detailEntries.length ? Object.fromEntries(detailEntries) : null,
    time: new Date().toISOString(),
    city: geo.city || null,
    region: geo.subdivision?.name || null,
    country: geo.country?.name || null,
    browser: device.browser + (device.browserVersion ? ' ' + device.browserVersion : ''),
    os: device.os + (device.osVersion ? ' ' + device.osVersion : ''),
    deviceType: device.deviceType,
  };

  await appendToLog(store, logEntry);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

async function incrementCounters(store, keys) {
  const current = (await store.get('counters', { type: 'json' })) || {};
  for (const key of keys) {
    current[key] = (current[key] || 0) + 1;
  }
  await store.setJSON('counters', current);
}

async function appendToLog(store, entry) {
  const existing = await store.get('event-log', { type: 'json' });
  const log = Array.isArray(existing) ? existing : [];
  log.unshift(entry);
  if (log.length > MAX_LOG_ENTRIES) log.length = MAX_LOG_ENTRIES;
  await store.setJSON('event-log', log);
}

export const config = {
  path: '/.netlify/functions/track-event',
};
