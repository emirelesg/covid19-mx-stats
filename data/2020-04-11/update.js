const fs = require('fs');
const utils = require('../../src/utils/utils');

const statsText = fs.readFileSync('./Stats.json', 'utf8');
const stats = JSON.parse(statsText);
stats.timeseries.forEach((s) => {
  s.tests = 0;
});
stats.statesAsArray.forEach((s) => {
  s.tests = 0;
});
Object.keys(stats.states).forEach((key) => {
  stats.states[key].tests = 0;
});
utils.saveJSON('./Stats.json', stats, false);

const statsByStateText = fs.readFileSync('./StatsByState.json', 'utf8');
const statsByState = JSON.parse(statsByStateText);
Object.keys(statsByState.states).forEach((key) => {
  statsByState.states[key].tests = new Array(statsByState.dates.length).fill(0);
});
utils.saveJSON('./StatsByState.json', statsByState, false);
