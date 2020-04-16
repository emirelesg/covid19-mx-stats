const utils = require('../../utils');
const config = require('../../config');
const getStateInfo = require('./getStateInfo');
const deploy = require('./deploy');
const discord = require('../../config/discord');

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

function saveStatsFile(stats, today) {
  utils.makeFolder(utils.getDirByDate(today));
  [utils.getStatsFileByDate(today), utils.getLatestStatsFile()].forEach(
    (file) => {
      console.log(`OK stats written to ${file}.`);
      utils.saveJSON(file, stats);
    }
  );
}

module.exports = (today, yesterday) =>
  new Promise((resolve, reject) => {
    getStateInfo()
      .then((statesInfo) => {
        const prevStatsObj = utils.readJSON(
          utils.getStatsFileByDate(yesterday)
        );
        const latestStatsObj = makeStats(prevStatsObj, statesInfo, today);
        const latestTimeseries = latestStatsObj.timeseries.slice(-1)[0];
        const prevTimeseries = prevStatsObj.timeseries.slice(-1)[0];
        if (areStatsDifferent(latestTimeseries, prevTimeseries))
          return latestStatsObj;
        throw new Error(`stats look to be the same from yesterday.
          yesterday: ${JSON.stringify(prevTimeseries).replace(/,/g, ', ')}
          today:     ${JSON.stringify(latestTimeseries).replace(/,/g, ', ')}`);
      })
      .then((latestStatsObj) => saveStatsFile(latestStatsObj, today))
      .then(() => deploy(config.ftpFiles))
      .then(() => discord.send(`Stats updated and deployed.`))
      .then(resolve)
      .catch(reject);
  });
