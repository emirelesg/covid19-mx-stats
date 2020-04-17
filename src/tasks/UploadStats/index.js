const utils = require('../../utils/utils');
const config = require('../../config');
const getStateInfo = require('./getStateInfo');
const deploy = require('./deploy');

const { dryRun } = config.args;

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

function saveStatsFile(log, stats, today) {
  if (!dryRun) utils.makeFolder(utils.getDirByDate(today));
  [utils.getStatsFileByDate(today), utils.getLatestStatsFile()].forEach(
    (file) => {
      log(`Stats written to ${file}.`);
      if (!dryRun) utils.saveJSON(file, stats);
    }
  );
}

module.exports = async (log, today, yesterday) => {
  const statesInfo = await getStateInfo(log);

  const prevStatsObj = utils.readJSON(utils.getStatsFileByDate(yesterday));
  const latestStatsObj = makeStats(prevStatsObj, statesInfo, today);
  const latestTimeseries = latestStatsObj.timeseries.slice(-1)[0];
  const prevTimeseries = prevStatsObj.timeseries.slice(-1)[0];
  if (!areStatsDifferent(latestTimeseries, prevTimeseries)) {
    throw new Error(`Stats look to be the same from yesterday.
    yesterday: ${JSON.stringify(prevTimeseries).replace(/,/g, ', ')}
    today:     ${JSON.stringify(latestTimeseries).replace(/,/g, ', ')}`);
  }

  saveStatsFile(log, latestStatsObj, today);
  await deploy(log, config.ftpFiles);
  return true;
};
