const csv = require('csv-parser');
const moment = require('moment');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const unzipper = require('unzipper');
const { getHeapStatistics } = require('v8');
const config = require('../../config');
const utils = require('../../utils/utils');

function availableMemory() {
  return `${Math.floor(
    getHeapStatistics().total_available_size / 1024 / 1024
  )}MB`;
}

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
      log(`Found row with today's date ${todayRegex}`);
      const url = row.find('a').first().attr('href');
      if (url.match(config.source.zipRegex) && !zipUrl) {
        log(`Found zip url: ${url}`);
        zipUrl = url;
      }
    }
  });
  return zipUrl;
}

function extractZip(today) {
  return new Promise((resolve, reject) => {
    const zipFile = utils.getSourceZipByDate(today);
    const csvFile = utils.getSourceCsvByDate(today);
    fs.createReadStream(zipFile)
      .pipe(unzipper.ParseOne(config.source.csvRegex))
      .pipe(fs.createWriteStream(csvFile))
      .on('error', reject)
      .on('finish', () => resolve(fs.existsSync(csvFile)));
  });
}

function parseSourceCsv(log, today) {
  const activeThresh = today.clone().subtract('14', 'days');
  const residenceThresh = moment('2020-04-21');
  const keyChangeThresh = moment('2020-10-07');
  const output = {
    confirmed: utils.makeStatesObj(),
    deaths: utils.makeStatesObj(),
    suspected: utils.makeStatesObj(),
    active: utils.makeStatesObj(),
    bySymptoms: {},
    tests: utils.makeStatesObj()
  };
  const csvFile = utils.getSourceCsvByDate(today);

  return new Promise((resolve, reject) => {
    log(`Processing csv file, heap ${availableMemory()}`);
    fs.createReadStream(csvFile)
      .pipe(csv())
      .on('data', (data) => {
        // State where the case lives.
        // Government started used residence as the mapping key
        // starting on 2020-04-21
        const reportedState = today.isSameOrAfter(residenceThresh)
          ? data.ENTIDAD_RES // 7
          : data.ENTIDAD_UM; // 4
        const stateKey = config.stateKeys[parseInt(reportedState, 10)];

        // Status of the patient.
        let result;
        let isInfected;
        let isNotInfected;
        let isSuspected;
        let isDeceased;
        if (today.isSameOrAfter(keyChangeThresh)) {
          result = parseInt(data.CLASIFICACION_FINAL, 10);
          isInfected = result === 1 || result === 2 || result === 3;
          isNotInfected = result === 7;
          isSuspected = result === 6 || result === 5 || result === 4;
          isDeceased = data.FECHA_DEF !== '9999-99-99';
        } else {
          result = parseInt(data.RESULTADO, 10);
          isInfected = result === 1;
          isNotInfected = result === 2;
          isSuspected = result === 3;
          isDeceased = data.FECHA_DEF !== '9999-99-99';
        }

        // Start of Symptoms
        const startOfSymptoms = moment(data.FECHA_SINTOMAS);
        const startOfSymptomsKey = startOfSymptoms.format(
          config.outputDatePattern
        );
        const isActive = startOfSymptoms.isAfter(activeThresh);

        // Only process recognized states.
        if (stateKey) {
          output.tests[stateKey] += 1;
          if (isInfected) {
            output.confirmed[stateKey] += 1;
            if (output.bySymptoms[startOfSymptomsKey]) {
              output.bySymptoms[startOfSymptomsKey][stateKey] += 1;
            } else {
              output.bySymptoms[startOfSymptomsKey] = utils.makeStatesObj();
              output.bySymptoms[startOfSymptomsKey][stateKey] = 1;
            }
            if (isActive) {
              output.active[stateKey] += 1;
            }
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
      })
      .on('error', (err) => reject(err))
      .on('end', () => {
        // Convert the start of symptoms map to a sorted array.
        output.bySymptoms = Object.entries(output.bySymptoms).sort((a, b) =>
          a[0].localeCompare(b[0])
        );
        log(`Finished processing csv file, heap ${availableMemory()}`);
        resolve(output);
      });
  });
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

  // Only download or extract zip if no source csv file is found.
  if (!fs.existsSync(utils.getSourceCsvByDate(today))) {
    log(`Source csv does not exist.`);

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
  }

  const data = await parseSourceCsv(log, today);
  log(`Deleted csv file to save space`);

  // Delete csv file to save space.
  fs.unlinkSync(utils.getSourceCsvByDate(today));

  return data;
};

if (!module.parent) {
  const today = moment(config.args.date);
  const log = utils.print.sectionFn('csv', 'cyan');
  module.exports(log, today).then(console.log).catch(console.error);
}
