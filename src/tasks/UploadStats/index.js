const PromiseFtp = require('promise-ftp');
const path = require('path');
const fs = require('fs');
const utils = require('../../utils/utils');
const config = require('../../config');
const stats = require('./stats');
const csv = require('./csv');

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

module.exports = async (log, today, yesterday) => {
  // Gets the processed data from today.
  const processedData = await csv(log, today);

  // Create a stats object and validate that the received data is newer.
  log('Creating stats object with received data');
  const statsObj = stats.make(today, yesterday, processedData);
  stats.compare(log, statsObj, yesterday);

  // Make output folder if it does not exist.
  if (!dryRun) utils.makeDir(utils.getDirByDate(today));

  // Save stats object.
  stats.save(
    log,
    utils.getStatsByDate(today),
    utils.getLatestStats(),
    statsObj
  );

  // Create a stats by state object and save it.
  const statsByStateObj = stats.makeByState(today, yesterday, processedData);
  stats.save(
    log,
    utils.getStatsByStateByDate(today),
    utils.getLatestStatsByState(),
    statsByStateObj
  );

  // Create stats by symptoms object and save it.
  const statsBySymptomsObj = stats.makeBySymptoms(today);
  stats.save(
    log,
    utils.getStatsBySymptomsByDate(today),
    utils.getLatestStatsBySymptoms(),
    statsBySymptomsObj
  );

  // Deploy stats and stats by state to server.
  if (!config.args.local) {
    await deploy(log, config.ftpFiles);
  }

  return true;
};
