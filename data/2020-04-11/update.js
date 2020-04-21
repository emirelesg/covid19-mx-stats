const fs = require('fs');

// const statsText = fs.readFileSync('./Stats.json', 'utf8');
// const stats = JSON.parse(statsText);
// stats.timeseries.forEach((s) => {
//   s.active = 0;
// });
// stats.statesAsArray.forEach((s) => {
//   s.active = 0;
// });
// Object.keys(stats.states).forEach((key) => {
//   stats.states[key].active = 0;
// });
// fs.writeFileSync('./newStats.json', JSON.stringify(stats, null, 2), 'utf8');

// const statsByStateText = fs.readFileSync('./StatsByState.json', 'utf8');
// const statsByState = JSON.parse(statsByStateText);
// Object.keys(statsByState.states).forEach((key) => {
//   statsByState.states[key].active = new Array(statsByState.dates.length).fill(
//     0
//   );
// });
// fs.writeFileSync(
//   './newStatsByState.json',
//   JSON.stringify(statsByState, null, 0),
//   'utf8'
// );
