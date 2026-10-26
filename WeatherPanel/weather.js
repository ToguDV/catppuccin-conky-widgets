#!/usr/bin/env node
'use strict';

// Renders the whole WeatherPanel body as one fixed-size block:
// 5 lines of current conditions, separator, location and 5 forecast rows.
// Every line stays under ~30 characters so the Conky window never resizes.

const fs = require('fs');

const CACHE = '/tmp/weather.json';
// Slightly under the 900s execpi interval so every scheduled render
// actually refreshes instead of reusing the previous run's cache.
const CACHE_TTL = 14 * 60 * 1000;
const FETCH_TIMEOUT = 8000;
const FALLBACK_CITY = process.env.WEATHER_CITY || 'Madrid';

const ART_W = 11;
const LABEL_W = 13;
const LOC_W = 30;
const LOC_W_OFFLINE = 20;

const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const WMO = {
  0: ['☀', 'Clear'],
  1: ['◔', 'Mostly clear'],
  2: ['◑', 'Partly cloudy'],
  3: ['☁', 'Cloudy'],
  45: ['☁', 'Fog'],
  48: ['☁', 'Fog'],
  51: ['☂', 'Drizzle'],
  53: ['☂', 'Drizzle'],
  55: ['☂', 'Drizzle'],
  56: ['☂', 'Frz. drizzle'],
  57: ['☂', 'Frz. drizzle'],
  61: ['☂', 'Light rain'],
  63: ['☂', 'Rain'],
  65: ['☂', 'Heavy rain'],
  66: ['☂', 'Frz. rain'],
  67: ['☂', 'Frz. rain'],
  71: ['☃', 'Light snow'],
  73: ['☃', 'Snow'],
  75: ['☃', 'Heavy snow'],
  77: ['☃', 'Snow grains'],
  80: ['☂', 'Light showers'],
  81: ['☂', 'Showers'],
  82: ['☂', 'Heavy showers'],
  85: ['☃', 'Snow showers'],
  86: ['☃', 'Snow showers'],
  95: ['⚡', 'Thunderstorm'],
  96: ['⚡', 'Thunderstorm'],
  99: ['⚡', 'Thunderstorm'],
};

const COND_COLORS = {
  0: '#cba6f7', 1: '#cba6f7', 2: '#cba6f7',
  3: '#a6adc8', 45: '#a6adc8', 48: '#a6adc8',
  51: '#f5c2e7', 53: '#f5c2e7', 55: '#f5c2e7', 56: '#f5c2e7', 57: '#f5c2e7',
  61: '#f5c2e7', 63: '#f5c2e7', 65: '#f5c2e7', 66: '#f5c2e7', 67: '#f5c2e7',
  71: '#f5c2e7', 73: '#f5c2e7', 75: '#f5c2e7', 77: '#f5c2e7',
  80: '#f5c2e7', 81: '#f5c2e7', 82: '#f5c2e7',
  85: '#f5c2e7', 86: '#f5c2e7',
  95: '#f5c2e7', 96: '#f5c2e7', 99: '#f5c2e7',
};

// Fixed 11-column art, one set per condition family. Keeping all of them
// 5 lines tall keeps the panel height identical when the weather changes.
const ART = {
  sun: [
    '    \\   /',
    '     .-.',
    '  ― (   ) ―',
    '     `-´',
    '    /   \\',
  ],
  cloud: [
    '    .--.',
    ' .-(    ).',
    '(___.__)__)',
    '',
    '',
  ],
  rain: [
    '    .--.',
    ' .-(    ).',
    '(___.__)__)',
    "  ' ' ' ' '",
    "  ' ' ' ' '",
  ],
  snow: [
    '    .--.',
    ' .-(    ).',
    '(___.__)__)',
    '  *  *  *',
    '   *  *  *',
  ],
};

function wmo(code) {
  return WMO[code] || ['?', 'Unknown'];
}

function condColor(code) {
  return COND_COLORS[code] || '#a6adc8';
}

function colorTag(color) {
  return '${color ' + color + '}';
}

function fit(text, width) {
  const chars = Array.from(String(text));
  if (chars.length >= width) return chars.slice(0, width).join('');
  return chars.join('') + ' '.repeat(width - chars.length);
}

function clip(text, width) {
  const chars = Array.from(String(text));
  if (chars.length <= width) return chars.join('');
  return chars.slice(0, width - 1).join('') + '…';
}

function round(value) {
  return Math.round(Number(value));
}

function formatNum(value) {
  const n = Math.round(Number(value) * 10) / 10;
  return String(n);
}

function windDir(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(Number(deg) / 45) % 8];
}

function weekday(dateStr) {
  const t = Date.parse(dateStr + 'T12:00:00Z');
  return new Date(Number.isNaN(t) ? Date.now() : t).getUTCDay();
}

function artFor(code) {
  if (code === 0 || code === 1 || code === 2) return ART.sun;
  if (code === 3 || code === 45 || code === 48) return ART.cloud;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ART.snow;
  return ART.rain;
}

function hr() {
  return colorTag('#313244') + '${hr}' + colorTag('#cdd6f4');
}

function locName(loc) {
  const name = (loc && loc.name) || FALLBACK_CITY;
  return loc && loc.country ? `${name}, ${loc.country}` : name;
}

function locationLine(loc, offline) {
  const text = clip(locName(loc), offline ? LOC_W_OFFLINE : LOC_W);
  let line = colorTag('#cba6f7') + text + colorTag('#cdd6f4');
  if (offline) line += colorTag('#6c7086') + ' · offline' + colorTag('#cdd6f4');
  return line;
}

function forecastLines(daily) {
  const lines = [];
  for (let i = 0; i < 5; i++) {
    const code = daily.weather_code[i];
    const [sym, label] = wmo(code);
    const day = i === 0 ? 'Today' : WEEK[weekday(daily.time[i])];
    const dayColor = i === 0 ? '#f5c2e7' : '#cba6f7';
    const left = colorTag(dayColor) + day.padEnd(6)
      + colorTag(condColor(code)) + sym
      + colorTag('#a6adc8') + ' ' + fit(label, LABEL_W) + ' ';
    const right = colorTag('#f5c2e7')
      + round(daily.temperature_2m_max[i]) + '°/' + round(daily.temperature_2m_min[i]) + '°'
      + colorTag('#cdd6f4');
    lines.push(left + '${alignr}' + right);
  }
  return lines;
}

function renderLines(weather) {
  const c = weather.data.current;
  const [sym, label] = wmo(c.weather_code);
  const info = [
    colorTag(condColor(c.weather_code)) + sym + colorTag('#a6adc8') + ' ' + label,
    round(c.temperature_2m) + '° (' + round(c.apparent_temperature) + '°)',
    '<- ' + round(c.wind_speed_10m) + ' km/h ' + windDir(c.wind_direction_10m),
    round(c.relative_humidity_2m) + '%',
    formatNum(c.precipitation) + ' mm',
  ];
  const art = artFor(c.weather_code);
  const lines = info.map((text, i) => {
    const value = i === 1 ? colorTag('#f5c2e7') + text : text;
    return colorTag('#cba6f7') + fit(art[i], ART_W)
      + colorTag('#a6adc8') + '  ' + value
      + colorTag('#cdd6f4');
  });
  lines.push(hr());
  lines.push(locationLine(weather.loc, weather.offline));
  lines.push(...forecastLines(weather.data.daily));
  return lines;
}

function placeholderLines() {
  const art = ART.sun;
  const info = ['No weather', 'data', '', '', ''];
  const lines = info.map((text, i) =>
    colorTag('#cba6f7') + fit(art[i], ART_W)
    + colorTag('#a6adc8') + '  ' + text
    + colorTag('#cdd6f4'));
  lines.push(hr());
  lines.push(colorTag('#6c7086') + 'offline' + colorTag('#cdd6f4'));
  const now = new Date();
  for (let i = 0; i < 5; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const day = i === 0 ? 'Today' : WEEK[date.getDay()];
    const dayColor = i === 0 ? '#f5c2e7' : '#cba6f7';
    lines.push(
      colorTag(dayColor) + day.padEnd(6)
      + colorTag('#6c7086') + ' ' + fit('--', LABEL_W) + ' '
      + '${alignr}' + colorTag('#6c7086') + '--/--' + colorTag('#cdd6f4')
    );
  }
  return lines;
}

function readCache() {
  try {
    const cached = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
    return validWeather(cached) ? cached : null;
  } catch (e) {
    return null;
  }
}

function validWeather(cached) {
  if (!cached || typeof cached.t !== 'number') return false;
  const c = cached.data && cached.data.current;
  const d = cached.data && cached.data.daily;
  if (!c || !d) return false;
  const currentFields = [
    'temperature_2m', 'apparent_temperature', 'weather_code',
    'wind_speed_10m', 'wind_direction_10m', 'relative_humidity_2m',
    'precipitation',
  ];
  if (!currentFields.every((field) => typeof c[field] === 'number')) return false;
  const dailyFields = ['time', 'weather_code', 'temperature_2m_max', 'temperature_2m_min'];
  if (!dailyFields.every((field) => Array.isArray(d[field]) && d[field].length >= 5)) return false;
  const numericDaily = ['weather_code', 'temperature_2m_max', 'temperature_2m_min'];
  return numericDaily.every((field) =>
    d[field].slice(0, 5).every((value) => typeof value === 'number'));
}

function writeCache(weather) {
  const tmp = CACHE + '.' + process.pid + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(weather));
    fs.renameSync(tmp, CACHE);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch (e2) {}
  }
}

async function fetchJson(url, name) {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
  if (!res.ok) throw new Error(name + ' HTTP ' + res.status);
  return res.json();
}

async function getLocation() {
  try {
    const d = await fetchJson(
      'http://ip-api.com/json?fields=status,message,lat,lon,city,countryCode',
      'ip-api'
    );
    if (d.status === 'success' && typeof d.lat === 'number' && typeof d.lon === 'number') {
      return {
        lat: d.lat,
        lon: d.lon,
        name: d.city || FALLBACK_CITY,
        country: d.countryCode || '',
      };
    }
  } catch (e) {}
  const d = await fetchJson(
    'https://geocoding-api.open-meteo.com/v1/search?name='
      + encodeURIComponent(FALLBACK_CITY) + '&count=1&language=en',
    'geocoding'
  );
  const loc = d.results && d.results[0];
  if (!loc) throw new Error('city not found');
  return {
    lat: loc.latitude,
    lon: loc.longitude,
    name: loc.name,
    country: loc.country_code || '',
  };
}

async function getForecast(loc) {
  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${loc.lat}&longitude=${loc.lon}`
    + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min'
    + '&forecast_days=5&timezone=auto';
  return fetchJson(url, 'open-meteo');
}

async function getWeather() {
  const cached = readCache();
  if (cached && Date.now() - cached.t < CACHE_TTL) {
    return Object.assign({}, cached, { offline: false });
  }
  try {
    let loc;
    try {
      loc = await getLocation();
    } catch (e) {
      // Location services can fail while the forecast API still works;
      // reuse the cached coordinates in that case.
      if (!cached || !cached.loc
        || typeof cached.loc.lat !== 'number' || typeof cached.loc.lon !== 'number') {
        throw e;
      }
      loc = cached.loc;
    }
    const data = await getForecast(loc);
    const weather = { t: Date.now(), loc, data };
    writeCache(weather);
    return Object.assign({}, weather, { offline: false });
  } catch (e) {
    if (cached) return Object.assign({}, cached, { offline: true });
    return null;
  }
}

function emit(lines) {
  process.stdout.write(lines.join('\n') + (process.stdout.isTTY ? '\n' : ''));
}

async function main() {
  let weather = null;
  try {
    weather = await getWeather();
  } catch (e) {
    weather = null;
  }
  try {
    emit(weather ? renderLines(weather) : placeholderLines());
  } catch (e) {
    emit(placeholderLines());
  }
}

main();
