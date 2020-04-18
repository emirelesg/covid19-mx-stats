const PromiseFtp = require('promise-ftp');
const path = require('path');
const fs = require('fs');
const utils = require('../../utils/utils');
const config = require('../../config');
const proxy = require('./proxy');
const stats = require('./stats');

const { dryRun } = config.args;

async function deploy(log, files) {
  const ftp = new PromiseFtp();
  await ftp.connect(config.ftp);
  await files.reduce(
    (previous, { local, remote }) =>
      previous.then(() => {
        const fullpath = path.resolve(local);
        if (!fs.existsSync(fullpath) || !fs.lstatSync(fullpath).isFile()) {
          throw new Error(
            `Failed to upload. File does not exist or is a folder: ${local}`
          );
        }
        log(`Uploading ${local} to ${remote}`);
        return dryRun ? Promise.resolve() : ftp.put(fullpath, remote);
      }),
    Promise.resolve()
  );
  await ftp.end();
  return true;
}

function processData(log, rawData) {
  log(`Processing intercepted data`);
  const o = { confirmed: {}, suspected: {}, deaths: {} };
  JSON.parse(JSON.parse(rawData).d).forEach((rawState) => {
    if (rawState.length >= 8) {
      const stateMatch = config.states.find((statePattern) =>
        rawState[1].match(statePattern[3])
      );
      if (stateMatch) {
        o.confirmed[stateMatch[0]] = parseInt(rawState[4], 10);
        o.suspected[stateMatch[0]] = parseInt(rawState[6], 10);
        o.deaths[stateMatch[0]] = parseInt(rawState[7], 10);
      }
    } else {
      throw new Error(`Unknown state data format: ${rawState}`);
    }
  });
  return o;
}

module.exports = async (log, today, yesterday) => {
  // Intercept data from map and process it to obtain data about each state.
  const rawStatesInfo = await proxy(log);
  const processedData = processData(log, rawStatesInfo);

  // Create a stats object and validate that the received data is newer.
  log('Creating stats object with received data');
  const statsObj = stats.make(today, yesterday, processedData);
  stats.compare(log, statsObj, yesterday);

  // Make output folder if it does not exist.
  if (!dryRun) utils.makeFolder(utils.getDirByDate(today));

  // Save stats object.
  stats.save(log, today, statsObj);

  // Create a stats by state object and save it.
  const statsByStateObj = stats.makeByState(today, yesterday);
  stats.saveByState(log, today, statsByStateObj);

  // Deploy stats and stats by state to server.
  await deploy(log, config.ftpFiles);

  return true;
};
