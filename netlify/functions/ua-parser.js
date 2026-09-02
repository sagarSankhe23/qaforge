// netlify/functions/ua-parser.js
//
// Minimal, dependency-free User-Agent parser.
//
// FIX: previously, Android devices with a reduced/simplified User-Agent
// (no version number right after "Android", common on newer Chrome/Android
// tablets) fell through to a generic Linux match instead of being
// recognized as Android. Now checks for the "Android" keyword on its own,
// with version extraction as a bonus rather than a requirement.
//
// FIX: device type — Android tablets typically omit "Mobile" from their
// User-Agent (that's literally how Android signals "this is a tablet"),
// but the old logic treated any UA containing "Android" as Mobile. Now
// Android + no "Mobile" token = Tablet.

export function parseUserAgent(ua) {
  if (!ua) return { browser: 'Unknown', browserVersion: '', os: 'Unknown', osVersion: '', deviceType: 'Unknown' };

  let browser = 'Unknown', browserVersion = '';
  if (/Edg\//.test(ua)) {
    browser = 'Edge'; browserVersion = match(ua, /Edg\/([\d.]+)/);
  } else if (/OPR\//.test(ua) || /Opera/.test(ua)) {
    browser = 'Opera'; browserVersion = match(ua, /OPR\/([\d.]+)/);
  } else if (/SamsungBrowser/.test(ua)) {
    browser = 'Samsung Internet'; browserVersion = match(ua, /SamsungBrowser\/([\d.]+)/);
  } else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) {
    browser = 'Chrome'; browserVersion = match(ua, /Chrome\/([\d.]+)/);
  } else if (/Firefox\//.test(ua)) {
    browser = 'Firefox'; browserVersion = match(ua, /Firefox\/([\d.]+)/);
  } else if (/Version\/[\d.]+.*Safari/.test(ua) || (/Safari\//.test(ua) && !/Chrome/.test(ua))) {
    browser = 'Safari'; browserVersion = match(ua, /Version\/([\d.]+)/);
  }

  let os = 'Unknown', osVersion = '';
  if (/Windows NT 10\.0/.test(ua)) { os = 'Windows'; osVersion = '10/11'; }
  else if (/Windows NT ([\d.]+)/.test(ua)) { os = 'Windows'; osVersion = match(ua, /Windows NT ([\d.]+)/); }
  else if (/Mac OS X ([\d_]+)/.test(ua) && !/iPhone|iPad/.test(ua)) {
    os = 'macOS'; osVersion = match(ua, /Mac OS X ([\d_]+)/).replace(/_/g, '.');
  } else if (/iPhone|iPad|iPod/.test(ua)) {
    os = 'iOS'; osVersion = match(ua, /OS ([\d_]+) like Mac/).replace(/_/g, '.');
  } else if (/Android/i.test(ua)) {
    // Check for "Android" on its own first — version is a bonus, not a
    // requirement, since reduced UAs sometimes omit it (e.g. "Android; K)")
    os = 'Android';
    osVersion = match(ua, /Android\s([\d.]+)/);
  } else if (/CrOS/.test(ua)) { os = 'ChromeOS'; }
  else if (/Linux/.test(ua)) { os = 'Linux'; }

  let deviceType = 'Desktop';
  if (/iPad|Tablet/.test(ua)) {
    deviceType = 'Tablet';
  } else if (/Android/.test(ua) && !/Mobile/.test(ua)) {
    // Android's own convention: tablets omit "Mobile" from the UA string
    deviceType = 'Tablet';
  } else if (/Mobile|iPhone|Android/.test(ua)) {
    deviceType = 'Mobile';
  }

  return { browser, browserVersion, os, osVersion, deviceType };
}

function match(str, regex) {
  const m = str.match(regex);
  return m ? m[1] : '';
}
