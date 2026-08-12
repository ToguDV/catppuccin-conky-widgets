#!/usr/bin/env node

'use strict';

const BAR_WIDTH = 30;
const BAR_LINE_WIDTH = BAR_WIDTH + 2;

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function dayOfYear(now) {
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  return Math.floor((now - startOfYear) / 86400000) + 1;
}

function buildBar(progress) {
  const filled = Math.round(progress * BAR_WIDTH);
  return '[' + '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled) + ']';
}

function main() {
  const now = new Date();
  const totalDays = isLeapYear(now.getFullYear()) ? 366 : 365;
  const day = dayOfYear(now);
  const progress = day / totalDays;
  const flag = process.argv[2];

  switch (flag) {
    case '--fraction':
      console.log(progress.toFixed(4));
      break;
    case '--percent':
      console.log((progress * 100).toFixed(1));
      break;
    case '--days':
      console.log(`${day} / ${totalDays}`);
      break;
    case '--days-left':
      console.log(totalDays - day);
      break;
    case '--bar':
      console.log(buildBar(progress));
      break;
    default: {
      const year = now.getFullYear();
      const date = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${year}`;
      const headerLeft = `YEAR ${year}  ·  ${date}`;
      const headerRight = `DAY ${day} / ${totalDays}`;
      const bar = buildBar(progress);
      const bottomLine = `${(progress * 100).toFixed(1)}%  ·  ${totalDays - day} days left`;
      const leftPad = Math.floor((BAR_LINE_WIDTH - bottomLine.length) / 2);
      const middlePad = Math.max(BAR_LINE_WIDTH - headerLeft.length - headerRight.length, 1);

      console.log(headerLeft + ' '.repeat(middlePad) + headerRight);
      console.log(bar);
      console.log(' '.repeat(Math.max(leftPad, 0)) + bottomLine);
    }
  }
}

main();
