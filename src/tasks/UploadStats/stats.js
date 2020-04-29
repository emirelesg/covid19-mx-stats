const fs = require('fs');
const moment = require('moment');
const config = require('../../config');
const utils = require('../../utils/utils');

const { dryRun } = config.args;

function makeBySymptoms(today) {
  // Create an array with the timeseriesBySymptoms for all dates after
  // 2020-04-12, this is to create an animation.
  const symptoms = [];
  for (
    let date = moment('2020-04-12');
    date.isSameOrBefore(today);
    date.add(1, 'day')
  ) {
    const data = utils.readJSON(utils.getStatsByDate(date));
    symptoms.push([
      date.format(config.outputDatePattern),
      data.timeseriesBySymptoms.map((obj) => [obj.date, obj.cases])
    ]);
  }
  return { symptoms };
}

function makeByState(today, yesterday, { bySymptoms }) {
  // Build the stats by state object using the object from yesterday or create
  // a new one if it does not exist.
  const yesterdayStatsByState = utils.getStatsByStateByDate(yesterday);
  let output = {};
  if (fs.existsSync(yesterdayStatsByState)) {
    output = utils.readJSON(yesterdayStatsByState);
  } else {
    output = {
      dates: [],
      states: config.states.reduce((obj, [stateKey, stateName]) => {
        return {
          ...obj,
          [stateKey]: {
            name: stateName,
            confirmed: [],
            suspected: [],
            deaths: [],
            active: []
          }
        };
      }, {})
    };
  }

  const todayStats = utils.readJSON(utils.getStatsByDate(today));

  Object.entries(todayStats.states).forEach(
    ([stateKey, { confirmed, deaths, suspected, active, tests }]) => {
      output.states[stateKey].confirmed.push(confirmed || 0);
      output.states[stateKey].suspected.push(suspected || 0);
      output.states[stateKey].deaths.push(deaths || 0);
      output.states[stateKey].active.push(active || 0);
      output.states[stateKey].tests.push(tests || 0);

      // Add the start of symptoms data to object.
      output.states[stateKey].bySymptoms = [];
      bySymptoms.forEach(([, stateData]) => {
        output.states[stateKey].bySymptoms.push(stateData[stateKey]);
      });
    }
  );

  // Append dates of start of symtpoms to output.
  output.datesBySymptoms = bySymptoms.map(([date]) => date);

  // Append today's data to the stats by state object from yesterday.
  output.dates.push(today.format(config.outputDatePattern));

  return output;
}

function make(today, yesterday, data) {
  // Contains data by state.
  const { confirmed, suspected, deaths, active, bySymptoms, tests } = data;

  // Build stats object using today's data and yesterday's stats object.
  const prevStats = utils.readJSON(utils.getStatsByDate(yesterday));
  const stats = {
    timeseries: [
      ...prevStats.timeseries,
      {
        date: today.format(config.outputDatePattern),
        confirmed: Object.values(confirmed).reduce((a, o) => a + o, 0),
        deaths: Object.values(deaths).reduce((a, o) => a + o, 0),
        suspected: Object.values(suspected).reduce((a, o) => a + o, 0),
        active: Object.values(active).reduce((a, o) => a + o, 0),
        tests: Object.values(tests).reduce((a, o) => a + o, 0)
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
          suspected: suspected[key] || 0,
          active: active[key] || 0,
          tests: tests[key] || 0
        }
      }),
      {}
    ),
    statesAsArray: undefined,
    timeseriesBySymptoms: bySymptoms.map(([date, states]) => ({
      date,
      cases: Object.values(states).reduce((a, o) => a + o, 0)
    }))
  };

  // Saves the state data as an array.
  stats.statesAsArray = Object.entries(stats.states).map(([key, values]) => ({
    key,
    ...values,
    date: today.format(config.outputDatePattern)
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

function save(log, filePath, minifiedPath, object) {
  if (!dryRun) utils.saveJSON(filePath, object, false);
  log(`Saved stats to ${filePath}`);
  // Minify latest stats file.
  if (!dryRun) utils.saveJSON(minifiedPath, object, true);
  log(`Saved minified stats to ${minifiedPath}`);
}

module.exports = {
  makeByState,
  makeBySymptoms,
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
