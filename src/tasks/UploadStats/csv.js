const parse = require('csv-parse/lib/sync');
const moment = require('moment');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const unzipper = require('unzipper');
const path = require('path');
const config = require('../../config');
const utils = require('../../utils/utils');

async function getZipUrl(log, today) {
  let zipUrl;

  log(`Opening site: ${config.source.url}`);
  const { data } = await axios({ url: config.source.url, method: 'GET' });
  const $ = cheerio.load(data);
  const todayRegex = new RegExp(
    today.format(config.source.webUpdateDateFormat),
    'g'
  );
  $('table > tbody > tr:nth-child(1)').each((i, tr) => {
    const row = $(tr);
    if (row.text().match(todayRegex)) {
      log(`Found row with todays's date ${todayRegex}`);
      const url = row.find('a').first().attr('href');
      if (url.match(config.source.zipRegex) && !zipUrl) {
        log(`Found zip url: ${url}`);
        zipUrl = url;
      }
    }
  });
  return zipUrl;
}

async function extractZip(today) {
  const zipFile = utils.getSourceZipByDate(today);
  const csvFile = utils.getSourceCsvByDate(today);
  fs.createReadStream(zipFile)
    .pipe(unzipper.Parse())
    .on('entry', (entry) => {
      const fileName = entry.path;
      const { type } = entry;
      if (fileName.match(config.source.csvRegex) && type === 'File') {
        entry.pipe(fs.createWriteStream(csvFile));
      } else {
        entry.autodrain();
      }
    });
  return fs.existsSync(csvFile);
}

function parseSourceCsv(log, today) {
  const activeThresh = today.clone().subtract('14', 'days');
  const output = {
    confirmed: utils.makeStatesObj(),
    deaths: utils.makeStatesObj(),
    suspected: utils.makeStatesObj(),
    active: utils.makeStatesObj()
  };
  const csvFile = utils.getSourceCsvByDate(today);

  log(`Parsing csv file: ${csvFile}`);
  const rows = parse(fs.readFileSync(csvFile, 'utf-8'), {
    columns: true
  });

  rows.forEach((data) => {
    // State where the case was reported.
    const reportedState = data.ENTIDAD_UM;
    const stateKey = config.stateKeys[parseInt(reportedState, 10)];

    // Status of the patient.
    const result = parseInt(data.RESULTADO, 10);
    const isInfected = result === 1;
    const isNotInfected = result === 2;
    const isSuspected = result === 3;
    const isDeceased = data.FECHA_DEF !== '9999-99-99';

    // Start of Symptoms
    const startOfSymptoms = moment(data.FECHA_SINTOMAS);
    const isActive = startOfSymptoms.isAfter(activeThresh);

    // Only process recognized states.
    if (stateKey) {
      if (isInfected) {
        if (isActive) {
          output.active[stateKey] += 1;
        }
        output.confirmed[stateKey] += 1;
        if (isDeceased) {
          output.deaths[stateKey] += 1;
        }
      } else if (isSuspected) {
        output.suspected[stateKey] += 1;
      } else if (isNotInfected) {
        //
      } else {
        log(`Unknown result ${data.RESULTADO}`);
      }
    } else {
      log(`Unknown state ${reportedState}`);
    }
  });
  return output;
}

module.exports = async (log, today) => {
  // Files and dirs.
  const baseDir = utils.getDirByDate(today);
  const sourceDir = utils.getSourceDirByDate(today);
  const zipFile = utils.getSourceZipByDate(today);

  // Make dirs if they do not exist.
  log(`Making dir ${baseDir}`);
  utils.makeDir(baseDir);
  log(`Making dir ${sourceDir}`);
  utils.makeDir(sourceDir);

  // Download zip if it does not exist.
  if (!fs.existsSync(zipFile)) {
    log(`Source zip does not exist.`);
    const zipUrl = await getZipUrl(log, today);
    if (!zipUrl) {
      throw new Error(`Failed to find link to zip url with today's date.`);
    }
    log(`Downloading zip file to ${zipFile}`);
    await utils.download(zipUrl, zipFile);
  } else {
    log(`Source zip already exists.`);
  }

  log(`Extracting zip file`);
  const isExtracted = await extractZip(today);
  if (!isExtracted) {
    throw new Error(`Failed to extract source file from ${zipFile}`);
  }

  return parseSourceCsv(log, today);
};

if (!module.parent) {
  const today = moment(config.args.date);
  const log = utils.print.sectionFn('csv', 'cyan');
  module.exports(log, today).then(console.log).catch(console.error);
}
