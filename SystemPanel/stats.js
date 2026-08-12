#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const BAR_WIDTH = 20;
const CPU_CACHE = '/tmp/sp-cpu.json';

function pct(used, total) {
  return total > 0 ? Math.round((used / total) * 100) : 0;
}

function bar(filledPct) {
  const f = Math.round((Math.min(Math.max(filledPct, 0), 100) / 100) * BAR_WIDTH);
  return '█'.repeat(f) + '░'.repeat(BAR_WIDTH - f);
}

function line(label, pct) {
  return `${label.padEnd(4)}  ${bar(pct)}  ${String(pct).padStart(3)}%`;
}

function sleep(ms) {
  const sab = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(sab), 0, 0, ms);
}

function sampleCpu() {
  const now = Date.now();
  try {
    const cached = JSON.parse(fs.readFileSync(CPU_CACHE, 'utf8'));
    if (now - cached.t < 1000 && typeof cached.pct === 'number') return cached.pct;
  } catch (e) {}
  const idle = (t) => t.idle + (t.iowait || 0);
  const t1 = os.cpus().reduce((a, c) => a + idle(c.times), 0);
  const t1total = os.cpus().reduce((a, c) => a + Object.values(c.times).reduce((x, y) => x + y, 0), 0);
  sleep(500);
  const t2 = os.cpus().reduce((a, c) => a + idle(c.times), 0);
  const t2total = os.cpus().reduce((a, c) => a + Object.values(c.times).reduce((x, y) => x + y, 0), 0);
  const usedPct = pct(t2total - t1total - (t2 - t1), t2total - t1total);
  fs.writeFileSync(CPU_CACHE, JSON.stringify({ t: now, pct: usedPct }));
  return usedPct;
}

function memInfo() {
  const out = {};
  fs.readFileSync('/proc/meminfo', 'utf8').split('\n').forEach((l) => {
    const m = l.match(/^(\w+):\s+(\d+)/);
    if (m) out[m[1]] = parseInt(m[2], 10);
  });
  return out;
}

function memPct() {
  const m = memInfo();
  return pct(m.MemTotal - m.MemAvailable, m.MemTotal);
}

function swapPct() {
  const m = memInfo();
  return m.SwapTotal === 0 ? -1 : pct(m.SwapTotal - m.SwapFree, m.SwapTotal);
}

function diskPct(path) {
  const s = fs.statfsSync(path);
  const total = s.blocks * s.bsize;
  const free = s.bfree * s.bsize;
  return pct(total - free, total);
}

function barOut(label, p) {
  console.log(`${label.padEnd(4)}  ${bar(p)}`);
}

function pctOut(p) {
  console.log(String(p).padStart(3) + '%');
}

const flag = process.argv[2];
const f2 = process.argv[3];

if (flag === '--cpu') {
  const p = sampleCpu();
  console.log(line('CPU', p));
} else if (flag === '--mem') {
  console.log(line('MEM', memPct()));
} else if (flag === '--swap') {
  const p = swapPct();
  console.log(p < 0 ? '' : line('SWP', p));
} else if (flag === '--disk') {
  console.log(line(f2 === '/' ? 'ROOT' : 'DATA', diskPct(f2 || '/')));
} else if (flag === '--cpu-bar') {
  barOut('CPU', sampleCpu());
} else if (flag === '--cpu-pct') {
  pctOut(sampleCpu());
} else if (flag === '--mem-bar') {
  barOut('MEM', memPct());
} else if (flag === '--mem-pct') {
  pctOut(memPct());
} else if (flag === '--swap-bar') {
  const p = swapPct();
  if (p >= 0) barOut('SWP', p);
} else if (flag === '--swap-pct') {
  const p = swapPct();
  if (p >= 0) pctOut(p);
} else if (flag === '--disk-bar') {
  const label = f2 === '/' ? 'ROOT' : 'DATA';
  barOut(label, diskPct(f2 || '/'));
} else if (flag === '--disk-pct') {
  const p = diskPct(f2 || '/');
  if (p >= 0) pctOut(p);
} else if (flag === '--date') {
  const WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  console.log(`${WEEK[d.getDay()]} ${day} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`);
} else {
  console.log(line('MEM', memPct()));
  const sp = swapPct();
  if (sp >= 0) console.log(line('SWP', sp));
  console.log(line('ROOT', diskPct('/')));
  console.log(line('DATA', diskPct('/mnt/datos')));
  console.log(line('CPU', sampleCpu()));
}
