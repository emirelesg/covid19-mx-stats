const moment = require('moment');
const fs = require('fs');
const path = require('path');
const log = require('single-line-log').stdout;
const axios = require('axios');
const cheerio = require('cheerio');
const url = require('url');
const config = require('./config');

function delay(ms) {
  return new Promise((resolve) => {
    console.log(`Waiting ${ms}ms...`);
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

function getDates() {
  const today = process.argv.length === 3 ? moment(process.argv[2]) : moment();
  const yesterday = moment(today).subtract(1, 'day');
  return { today, yesterday };
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
    encoding: 'utf-8',
  });
}

function makeFolder(folder) {
  if (!fs.existsSync(folder)) fs.mkdirSync(folder);
}

function getLatestStatsFile() {
  return path.join(config.outputDir, config.files.latest);
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

function countdown(timeout, callback) {
  let seconds = timeout;
  const interval = setInterval(() => {
    log(`Retrying in ${seconds} seconds`);
    if (seconds === 0) {
      clearInterval(interval);
      callback();
    }
    seconds -= 1;
  }, 1000);
}

function makeStats(prevStats, { confirmed, suspected, deaths }) {
  const output = {};
  const today = getDates().today.format(config.outputDatePattern);
  output.timeseries = [
    ...prevStats.timeseries,
    {
      date: today,
      confirmed: Object.values(confirmed).reduce((a, o) => a + o, 0),
      deaths: Object.values(deaths).reduce((a, o) => a + o, 0),
      suspected: Object.values(suspected).reduce((a, o) => a + o, 0),
    },
  ];
  output.states = config.states.reduce(
    (obj, [key, name]) => ({
      ...obj,
      [key]: {
        name,
        confirmed: confirmed[key] || 0,
        confirmedDelta: (confirmed[key] || 0) - prevStats.states[key].confirmed,
        deaths: deaths[key] || 0,
        suspected: suspected[key] || 0,
      },
    }),
    {}
  );
  output.statesAsArray = Object.entries(output.states).map(([key, values]) => ({
    key,
    ...values,
    date: today,
  }));
  return output;
}

module.exports = {
  getDates,
  makeStringSafe,
  readJSON,
  saveJSON,
  makeFolder,
  getDirByDate,
  getFileByDate,
  getStatsFileByDate,
  getLatestStatsFile,
  makeStats,
  countdown,
  download,
  getLinks,
  delay,
};
