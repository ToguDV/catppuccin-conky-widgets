#!/usr/bin/env node
'use strict';

const fs = require('fs');
const CACHE = '/tmp/weather.json';
const CACHE_TTL = 15 * 60 * 1000;
const FALLBACK_CITY = process.env.WEATHER_CITY || 'Madrid';

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
  56: ['☂', 'Freezing drizzle'],
  57: ['☂', 'Freezing drizzle'],
  61: ['☂', 'Light rain'],
  63: ['☂', 'Rain'],
  65: ['☂', 'Heavy rain'],
  66: ['☂', 'Freezing rain'],
  67: ['☂', 'Freezing rain'],
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

function wmo(code) {
  return WMO[code] || ['?', 'Unknown'];
}

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

function condColor(code) {
  return COND_COLORS[code] || '#a6adc8';
}

function tempColor(t) {
  return '#f5c2e7';
}

function colorTag(c) {
  return '${color ' + c + '}';
}

async function getLocation() {
  try {
    const r = await fetch('http://ip-api.com/json');
    if (!r.ok) throw new Error('ip-api failed');
    const d = await r.json();
    if (d.status !== 'success') throw new Error(d.message || 'no location');
    return { lat: d.lat, lon: d.lon, name: d.city, country: d.countryCode };
  } catch (e) {}
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(FALLBACK_CITY)}&count=1&language=en`;
    const r = await fetch(url);
    const d = await r.json();
    const loc = d.results && d.results[0];
    if (!loc) throw new Error('city not found');
    return { lat: loc.latitude, lon: loc.longitude, name: loc.name, country: loc.country_code };
  } catch (e) {}
  throw new Error('could not resolve location');
}

async function getWeather() {
  if (fs.existsSync(CACHE)) {
    try {
      const cached = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
      if (Date.now() - cached.t < CACHE_TTL) return cached;
    } catch (e) {}
  }
  const loc = await getLocation();
  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${loc.lat}&longitude=${loc.lon}`
    + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min'
    + '&forecast_days=5&timezone=auto';
  const r = await fetch(url);
  if (!r.ok) throw new Error('forecast failed');
  const d = await r.json();
  const out = { t: Date.now(), loc, data: d };
  fs.writeFileSync(CACHE, JSON.stringify(out));
  return out;
}

function windDir(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

const flag = process.argv[2];
const arg = process.argv[3];

function printBlock({ data }) {
  const c = data.current;
  const [sym, label] = wmo(c.weather_code);
  const line = (art, text) => console.log(art.padEnd(11) + text);
  line('    \\   /', `${sym} ${label}`);
  line('     .-.', `${Math.round(c.temperature_2m)}° (${Math.round(c.apparent_temperature)}°)`);
  console.log('  (   )       ' + '←' + ` ${Math.round(c.wind_speed_10m)} km/h ${windDir(c.wind_direction_10m)}`);
  line('     `-´', `${c.relative_humidity_2m}%`);
  line('    /   \\', `${c.precipitation} mm`);
}

getWeather()
  .then(({ loc, data }) => {
    const c = data.current;
    const d = data.daily;
    if (flag === '--fallback-block') {
      printBlock({ data });
    } else if (flag === '--loc') {
      console.log(`${loc.name}, ${loc.country}`);
    } else if (flag === '--temp') {
      console.log(Math.round(c.temperature_2m) + '°');
    } else if (flag === '--symtemp') {
      console.log(`${wmo(c.weather_code)[0]} ${Math.round(c.temperature_2m)}°`);
    } else if (flag === '--cond') {
      const [sym, label] = wmo(c.weather_code);
      console.log(`${sym} ${label}`);
    } else if (flag === '--label') {
      console.log(wmo(c.weather_code)[1]);
    } else if (flag === '--feels') {
      const hum = c.relative_humidity_2m;
      const wind = `${Math.round(c.wind_speed_10m)} km/h ${windDir(c.wind_direction_10m)}`;
      console.log(`Feels ${Math.round(c.apparent_temperature)}°  ·  ${hum}%  ·  ${wind}`);
    } else if (flag === '--color-art') {
      console.log(colorTag('#cba6f7'));
    } else if (flag === '--color-cond') {
      console.log(colorTag(condColor(c.weather_code)));
    } else if (flag === '--color-temp') {
      console.log(colorTag(tempColor(c.temperature_2m)));
    } else if (flag === '--day') {
      const i = parseInt(arg || '0', 10);
      const [sym, label] = wmo(d.weather_code[i]);
      const name = i === 0 ? 'Today' : new Date(d.time[i] + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
      const dayColor = i === 0 ? '#f5c2e7' : '#cba6f7';
      console.log(colorTag(dayColor) + name.padEnd(6) + colorTag(condColor(d.weather_code[i])) + sym + colorTag('#a6adc8') + ' ' + label);
    } else if (flag === '--temps') {
      const i = parseInt(arg || '0', 10);
      console.log(colorTag(tempColor(d.temperature_2m_max[i])) + `${Math.round(d.temperature_2m_max[i])}°/${Math.round(d.temperature_2m_min[i])}°`);
    } else {
      console.log(`LOC   ${loc.name}, ${loc.country}`);
      console.log(`NOW   ${Math.round(c.temperature_2m)}° ${wmo(c.weather_code)[1]}`);
      console.log(`FEELS ${Math.round(c.apparent_temperature)}° · ${c.relative_humidity_2m}% · ${Math.round(c.wind_speed_10m)} km/h`);
      for (let i = 0; i < d.weather_code.length; i++) console.log(`DAY${i}  ${wmo(d.weather_code[i])[1]}`);
    }
  })
  .catch((e) => {
    if (flag === '--fallback-block') {
      try {
        const cached = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
        printBlock(cached);
      } catch (e2) {
        process.exit(1);
      }
      return;
    }
    if (fs.existsSync(CACHE)) {
      const cached = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
      const c = cached.data.current;
      console.log(`${Math.round(c.temperature_2m)}° ${wmo(c.weather_code)[1]} (offline)`);
      return;
    }
    console.log('no data');
    process.exit(1);
  });
