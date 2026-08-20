// netlify/functions/ua-parser.js
//
// Minimal, dependency-free User-Agent parser. Covers the common cases
// (Chrome, Safari, Firefox, Edge, Samsung Internet, Opera; Windows, macOS,
// Android, iOS, Linux) — good enough for "which browser/OS is my resume
// visitor on", not meant to be exhaustive like a full ua-parser-js.

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
  } else if (/Android ([\d.]+)/.test(ua)) {
    os = 'Android'; osVersion = match(ua, /Android ([\d.]+)/);
  } else if (/Linux/.test(ua)) { os = 'Linux'; }

  let deviceType = 'Desktop';
  if (/iPad|Tablet/.test(ua)) deviceType = 'Tablet';
  else if (/Mobile|iPhone|Android/.test(ua)) deviceType = 'Mobile';

  return { browser, browserVersion, os, osVersion, deviceType };
}

function match(str, regex) {
  const m = str.match(regex);
  return m ? m[1] : '';
}
