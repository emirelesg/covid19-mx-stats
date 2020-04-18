const PromiseFtp = require('promise-ftp');
const path = require('path');
const fs = require('fs');
const utils = require('../../utils/utils');
const config = require('../../config');
const proxy = require('./proxy');

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

function makeStats(prevStats, { confirmed, suspected, deaths }, today) {
  const output = {};
  output.timeseries = [
    ...prevStats.timeseries,
    {
      date: today.format(config.outputDatePattern),
      confirmed: Object.values(confirmed).reduce((a, o) => a + o, 0),
      deaths: Object.values(deaths).reduce((a, o) => a + o, 0),
      suspected: Object.values(suspected).reduce((a, o) => a + o, 0)
    }
  ];
  output.states = config.states.reduce(
    (obj, [key, name]) => ({
      ...obj,
      [key]: {
        name,
        confirmed: confirmed[key] || 0,
        confirmedDelta: (confirmed[key] || 0) - prevStats.states[key].confirmed,
        deaths: deaths[key] || 0,
        suspected: suspected[key] || 0
      }
    }),
    {}
  );
  output.statesAsArray = Object.entries(output.states).map(([key, values]) => ({
    key,
    ...values,
    date: today
  }));
  return output;
}

function areStatsDifferent(latest, prev) {
  return (
    latest.confirmed !== prev.confirmed &&
    latest.suspected !== prev.suspected &&
    latest.deaths !== prev.deaths
  );
}

// TODO: only write to the latest file if it is really the latest.
function saveStatsFile(log, stats, today) {
  if (!dryRun) utils.makeFolder(utils.getDirByDate(today));
  [utils.getStatsFileByDate(today), utils.getLatestStatsFile()].forEach(
    (file) => {
      log(`Stats saved to ${file}`);
      if (!dryRun) utils.saveJSON(file, stats);
    }
  );
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
  const rawStatesInfo = await proxy(log);
  const statesInfo = processData(log, rawStatesInfo);
  log('Creating stats object with received data');
  const prevStatsObj = utils.readJSON(utils.getStatsFileByDate(yesterday));
  const latestStatsObj = makeStats(prevStatsObj, statesInfo, today);
  const latestTimeseries = latestStatsObj.timeseries.slice(-1)[0];
  const prevTimeseries = prevStatsObj.timeseries.slice(-1)[0];
  if (!areStatsDifferent(latestTimeseries, prevTimeseries)) {
    throw new Error(`Stats look to be the same from yesterday
    yesterday: ${JSON.stringify(prevTimeseries).replace(/,/g, ', ')}
    today:     ${JSON.stringify(latestTimeseries).replace(/,/g, ', ')}`);
  }
  log('Stats look to be different from yesterday');
  log(latestTimeseries);
  saveStatsFile(log, latestStatsObj, today);
  await deploy(log, config.ftpFiles);
  return true;
};
