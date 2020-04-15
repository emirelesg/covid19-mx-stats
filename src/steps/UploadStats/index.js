const utils = require('../../utils');
const config = require('../../config');
const getStateInfo = require('./getStateInfo');
const deploy = require('./deploy');

function areStatsDifferent(latest, prev) {
  const latestTimeseries = latest.timeseries[latest.timeseries.length - 1];
  const prevTimeseries = prev.timeseries[prev.timeseries.length - 1];
  return (
    latestTimeseries.confirmed !== prevTimeseries.confirmed &&
    latestTimeseries.suspected !== prevTimeseries.suspected &&
    latestTimeseries.deaths !== prevTimeseries.deaths
  );
}

function saveStatsFile(stats, today) {
  utils.makeFolder(utils.getDirByDate(today));
  [utils.getStatsFileByDate(today), utils.getLatestStatsFile()].forEach(
    (file) => {
      console.log(`OK stats written to ${file}.`);
      utils.saveJSON(file, stats);
    }
  );
}

module.exports = (today, yesterday) => {
  return new Promise((resolve, reject) => {
    getStateInfo()
      .then((statesInfo) => {
        const prevStatsObj = utils.readJSON(
          utils.getStatsFileByDate(yesterday)
        );
        const latestStatsObj = utils.makeStats(prevStatsObj, statesInfo, today);
        if (areStatsDifferent(latestStatsObj, prevStatsObj))
          return latestStatsObj;
        throw new Error(`stats look to be the same from yesterday.`);
      })
      .then((latestStatsObj) => saveStatsFile(latestStatsObj, today))
      .then(() => deploy(config.ftpFiles))
      .then(resolve)
      .catch(reject);
  });
};
