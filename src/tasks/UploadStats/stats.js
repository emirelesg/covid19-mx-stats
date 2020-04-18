const fs = require('fs');
const config = require('../../config');
const utils = require('../../utils/utils');

const { dryRun } = config.args;

function makeByState(today, yesterday) {
  // Build the stats by state object using the object from yesterday or create
  // a new one if it does not exist.
  const yesterdayStatsByState = utils.getStatsByStateByDate(yesterday);
  let statsByState = {};
  if (fs.existsSync(yesterdayStatsByState)) {
    statsByState = utils.readJSON(yesterdayStatsByState);
  } else {
    statsByState = {
      dates: [],
      states: config.states.reduce((obj, [stateKey, stateName]) => {
        return {
          ...obj,
          [stateKey]: {
            name: stateName,
            confirmed: [],
            suspected: [],
            deaths: []
          }
        };
      }, {})
    };
  }

  // Append today's data to the stats by state object from yesterday.
  const todayStats = utils.readJSON(utils.getStatsByDate(today));
  statsByState.dates.push(today.format(config.outputDatePattern));
  Object.entries(todayStats.states).forEach(
    ([stateKey, { confirmed, deaths, suspected }]) => {
      statsByState.states[stateKey].confirmed.push(confirmed);
      statsByState.states[stateKey].suspected.push(suspected);
      statsByState.states[stateKey].deaths.push(deaths);
    }
  );

  return statsByState;
}

function make(today, yesterday, data) {
  // Contains data by state.
  const { confirmed, suspected, deaths } = data;

  // Build stats object using today's data and yesterday's stats object.
  const prevStats = utils.readJSON(utils.getStatsByDate(yesterday));
  const stats = {
    timeseries: [
      ...prevStats.timeseries,
      {
        date: today.format(config.outputDatePattern),
        confirmed: Object.values(confirmed).reduce((a, o) => a + o, 0),
        deaths: Object.values(deaths).reduce((a, o) => a + o, 0),
        suspected: Object.values(suspected).reduce((a, o) => a + o, 0)
      }
    ],
    states: config.states.reduce(
      (obj, [key, name]) => ({
        ...obj,
        [key]: {
          name,
          confirmed: confirmed[key] || 0,
          confirmedDelta:
            (confirmed[key] || 0) - prevStats.states[key].confirmed,
          deaths: deaths[key] || 0,
          suspected: suspected[key] || 0
        }
      }),
      {}
    ),
    statesAsArray: undefined
  };

  // Saves the state data as an array.
  stats.statesAsArray = Object.entries(stats.states).map(([key, values]) => ({
    key,
    ...values,
    date: today
  }));

  return stats;
}

function compare(log, today, yesterday) {
  // Read stats from yesterday.
  const prevStats = utils.readJSON(utils.getStatsByDate(yesterday));

  // Get the last entry in the timeseries.
  const latest = today.timeseries.slice(-1)[0];
  const prev = prevStats.timeseries.slice(-1)[0];

  // Chcek if the timeseries data changed in all fields.
  if (
    latest.confirmed === prev.confirmed ||
    latest.suspected === prev.suspected ||
    latest.deaths === prev.deaths
  ) {
    throw new Error(`Stats look to be the same from yesterday
    yesterday: ${JSON.stringify(prev).replace(/,/g, ', ')}
    today:     ${JSON.stringify(latest).replace(/,/g, ', ')}`);
  }

  // Continue if they are different.
  log('Stats look to be different from yesterday');
  log(latest);
}

function save(log, today, stats) {
  const files = [utils.getStatsByDate(today), utils.getLatestStats()];
  files.forEach((file) => {
    if (!dryRun) utils.saveJSON(file, stats);
    log(`Saved stats to ${file}`);
  });
}

function saveByState(log, today, statsByState) {
  const files = [
    utils.getStatsByStateByDate(today),
    utils.getLatestStatsByState()
  ];
  files.forEach((file) => {
    if (!dryRun) utils.saveJSON(file, statsByState, true);
    log(`Saved stats by state to ${file}`);
  });
}

module.exports = {
  makeByState,
  saveByState,
  compare,
  make,
  save
};

// if (!module.parent) {
//   const moment = require('moment');
//   const today = moment(config.args.date);
//   const yesterday = moment(today).subtract(1, 'day');
//   const byState = makeByState(today, yesterday);
//   console.log(byState);
//   saveByState(console.log, today, byState);
// }
