const moment = require('moment');
const fs = require('fs');
const path = require('path');
const log = require('single-line-log').stdout;
const axios = require('axios');
const cheerio = require('cheerio');
const url = require('url');
const chalk = require('chalk');
const config = require('./config');

function printWelcome(today, retries, completed, isReady) {
  const formatedToday = today ? today.format('LL') : '-';
  const formatedRetries = today ? retries : '-';
  const formatedCompleted = completed ? completed.format('LL') : '-';
  const discordStatus = isReady ? 'ON' : 'OFF';
  const strings = [
    chalk`{cyan COVID-19 Mexico}`,
    chalk`Automatically update stats for {bold covid19.newtondreams.com}\n`,
    chalk`Last completed date: {green.bold ${formatedCompleted}}`,
    chalk`Processing data for: {cyan ${formatedToday}}`,
    chalk`Retries: {cyan ${formatedRetries}}`,
    chalk`Discord: {cyan ${discordStatus}}\n`
  ];
  return strings.join('\n');
}

function printSection(section, message, color, sameLine) {
  const coloredSection = chalk`{black.${color}  ${section} }`;
  const m = `${coloredSection} - ${message}`;
  if (sameLine) {
    log(m);
  } else {
    console.log(m);
  }
}

function printError(err) {
  const message = chalk`{red ${err.toString().replace('Error: ', '')}}`;
  printSection('Error', message, 'bgRed');
}

function printWait(date) {
  const currentDate = moment().format('MMMM Do YYYY, h:mm:ss a');
  return chalk`${currentDate} - {magenta ${date.fromNow()}}`;
}

function delay(ms) {
  return new Promise((resolve) => {
    console.log(`Waiting ${ms}ms...`);
    setTimeout(resolve, ms);
  });
}

function countdownPromise(seconds) {
  return new Promise((resolve) => {
    let remaining = seconds;
    const interval = setInterval(() => {
      printSection('Retry', `in ${remaining} seconds`, 'bgRed', true);
      if (remaining === 0) {
        console.log();
        clearInterval(interval);
        resolve(true);
      }
      remaining -= 1;
    }, 1000);
  });
}

function download(link, filepath) {
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filepath);
    axios({ url: link, method: 'GET', responseType: 'stream' })
      .then((res) => res.data.pipe(writer))
      .catch(reject);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

function getLinks(link) {
  return new Promise((resolve, reject) => {
    axios({ url: link, method: 'GET' })
      .then((response) => {
        const $ = cheerio.load(response.data);
        const pdfs = [];
        $('a').each((i, a) => {
          if (a.attribs.href)
            pdfs.push(url.resolve(response.config.url, a.attribs.href));
        });
        resolve(pdfs);
      })
      .catch(reject);
  });
}

function makeStringSafe(s) {
  return (
    s
      .toLowerCase()
      // Replace multiple spaces by one space.
      .replace(/\s+/g, ' ')
      // Remove new line characters.
      .replace(/\n/g, '')
      // Remove special characters.
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ó/g, 'o')
      .replace(/u/g, 'u')
      .replace(/ñ/g, 'n')
      // Typo
      .replace(/cuidad/g, 'ciudad')
      // Remove any whitespace at the start/end.
      .trim()
  );
}

function readJSON(file) {
  const data = fs.readFileSync(file, 'utf-8');
  return JSON.parse(data);
}

function saveJSON(file, obj) {
  const data = `${JSON.stringify(obj, null, 2)}\n`;
  fs.writeFileSync(file, data, {
    encoding: 'utf-8'
  });
}

function makeFolder(folder) {
  if (!fs.existsSync(folder)) fs.mkdirSync(folder);
}

function getLatestStatsFile() {
  return path.join(config.outputDir, config.files.latest);
}

function getLatestScreenshotFile() {
  return path.join(config.outputDir, config.files.latestScreenshot);
}

function getDirByDate(date) {
  return path.join(config.outputDir, date.format(config.outputDatePattern));
}

function getFileByDate(date, filename) {
  return path.join(getDirByDate(date), filename);
}

function getStatsFileByDate(date) {
  return getFileByDate(date, config.files.stats);
}

function step(number, desc, isComplete, callback, ...args) {
  printSection(`Step ${number}`, desc, 'bgMagenta');
  if (isComplete) {
    console.log(`Step already complete.`);
    return true;
  }
  return callback(...args);
}

module.exports = {
  makeStringSafe,
  readJSON,
  saveJSON,
  makeFolder,
  getDirByDate,
  getFileByDate,
  getStatsFileByDate,
  getLatestStatsFile,
  getLatestScreenshotFile,
  countdownPromise,
  download,
  getLinks,
  delay,
  print: {
    sameLine: log,
    welcome: printWelcome,
    section: printSection,
    error: printError,
    wait: printWait
  },
  step
};
