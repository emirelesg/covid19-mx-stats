const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const url = require('url');
const moment = require('moment');
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
    writer.on('finish', () => {
      console.log();
      return writer.close(resolve);
    });
    writer.on('error', (err) => {
      writer.close();
      fs.unlink(filepath);
      return reject(err);
    });
    axios({
      url: link,
      method: 'GET',
      responseType: 'stream'
    })
      .then(({ data, headers }) => {
        const contentLength = headers['content-length'];
        let downloadedLength = 0;
        data.on('data', (chunk) => {
          downloadedLength += chunk.length;
          print.download(Math.round((downloadedLength / contentLength) * 100));
        });
        return data.pipe(writer);
      })
      .catch((err) => {
        writer.close();
        fs.unlink(filepath);
        return reject(err);
      });
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

async function followRedirects(href) {
  const response = await axios.get(href);
  return response.request.res.responseUrl;
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

function saveJSON(file, obj, minify) {
  const data = `${JSON.stringify(obj, null, minify ? 0 : 2)}\n`;
  fs.writeFileSync(file, data, {
    encoding: 'utf-8'
  });
}

function makeDir(folder) {
  if (!fs.existsSync(folder)) fs.mkdirSync(folder);
}

function getLatestStats() {
  return path.join(config.outputDir, config.files.latest);
}

function getLatestStatsByState() {
  return path.join(config.outputDir, config.files.latestByState);
}

function getLatestStatsBySymptoms() {
  return path.join(config.outputDir, config.files.latestBySymptoms);
}

function getLatestScreenshot() {
  return path.join(config.outputDir, config.files.latestScreenshot);
}

function getDirByDate(date) {
  return path.join(config.outputDir, date.format(config.outputDatePattern));
}

function getSourceDirByDate(date) {
  return path.join(getDirByDate(date), config.source.dir);
}

function getSourceZipByDate(date) {
  return path.join(getSourceDirByDate(date), config.files.sourceZip);
}

function getSourceCsvByDate(date) {
  return path.join(getSourceDirByDate(date), config.files.sourceCsv);
}

function getFileByDate(date, filename) {
  return path.join(getDirByDate(date), filename);
}

function getStatsByDate(date) {
  return getFileByDate(date, config.files.stats);
}

function getStatsByStateByDate(date) {
  return getFileByDate(date, config.files.statsByState);
}

function getStatsBySymptomsByDate(date) {
  return getFileByDate(date, config.files.statsBySymptoms);
}

function execTask(number, desc, isComplete, callback, ...args) {
  const log = print.sectionFn(desc, 'blue');
  if (isComplete) {
    log(`Step already complete.`);
    return Promise.resolve(true);
  }
  return callback(log, ...args);
}

function isDateLatest(today) {
  const latestStats = readJSON(getLatestStats());
  const { date } = latestStats.timeseries.slice(-1)[0];
  const latest = moment(date);
  return moment(today.format(config.outputDatePattern)).isSameOrAfter(latest);
}

function makeStatesObj() {
  return config.states.reduce((obj, [key]) => ({ ...obj, [key]: 0 }), {});
}

module.exports = {
  makeStringSafe,
  readJSON,
  saveJSON,
  makeDir,
  makeStatesObj,
  isDateLatest,
  getDirByDate,
  getFileByDate,
  getStatsByDate,
  getLatestStatsBySymptoms,
  getStatsByStateByDate,
  getLatestStats,
  getLatestStatsByState,
  getLatestScreenshot,
  getSourceDirByDate,
  getSourceZipByDate,
  getSourceCsvByDate,
  getStatsBySymptomsByDate,
  countdownPromise,
  download,
  followRedirects,
  getLinks,
  delay,
  execTask,
  print
};
