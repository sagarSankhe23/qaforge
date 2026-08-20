// netlify/functions/get-stats.js
//
// Returns event counts + recent log for qaforge.netlify.app.
// Protected by STATS_SECRET.
//   https://qaforge.netlify.app/.netlify/functions/get-stats?key=YOUR_SECRET

import { getStore } from '@netlify/blobs';

export default async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');

  if (!process.env.STATS_SECRET || key !== process.env.STATS_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const store = getStore('qaforge-analytics');

  const stats = (await store.get('counters', { type: 'json' })) || {};
  const recentEvents = (await store.get('event-log', { type: 'json' })) || [];

  return new Response(JSON.stringify({ stats, recentEvents }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const config = {
  path: '/.netlify/functions/get-stats',
};
