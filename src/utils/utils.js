const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const url = require('url');
const config = require('../config');
const print = require('./print');

function countdownPromise(seconds) {
  return new Promise((resolve) => {
    let remaining = seconds;
    const interval = setInterval(() => {
      print.sectionSameLine('Retry', `in ${remaining} seconds`, 'red');
      if (remaining === 0) {
        console.log();
        clearInterval(interval);
        resolve(true);
      }
      remaining -= 1;
    }, 1000);
  });
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
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

async function getLinks(link) {
  const response = await axios({ url: link, method: 'GET' });
  const $ = cheerio.load(response.data);
  const links = [];
  $('a').each((i, a) => {
    if (a.attribs.href)
      links.push(url.resolve(response.config.url, a.attribs.href));
  });
  return links;
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

function execTask(number, desc, isComplete, callback, ...args) {
  const log = print.sectionFn(desc, 'blue');
  if (isComplete) {
    log(`Step already complete.`);
    return Promise.resolve(true);
  }
  return callback(log, ...args);
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
  execTask,
  print
};
