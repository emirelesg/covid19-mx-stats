const chalk = require('chalk');
const sameLineLog = require('single-line-log').stdout;
const moment = require('moment');

function fixedLengthString(s) {
  return s.length > 20 ? s.substr(0, 20) : s + Array(20 - s.length).join(' ');
}

function sectionFn(name, color) {
  const coloredName = chalk[color].bold(fixedLengthString(name));
  return (message) => {
    console.log(coloredName, message);
  };
}

function section(name, message, color, logFn) {
  const log = logFn || console.log;
  const coloredName = chalk[color].bold(fixedLengthString(name));
  log(coloredName, message);
}

function sectionSameLine(...args) {
  section(...args, sameLineLog);
}

function welcome() {
  console.log();
  console.log('-------------------------------------------------------');
  console.log();
  console.log(chalk`{cyan COVID-19 Mexico}`);
  console.log(
    chalk`Automatically update stats for {bold covid19.newtondreams.com}`
  );
  console.log(chalk`Started: {cyan ${moment().format('ll LTS')}}`);
  console.log();
}

function stats(today, retries) {
  console.log(chalk`Processing data for: {cyan ${today.format('LL')}}`);
  console.log(chalk`Retries: {cyan ${retries}}`);
  console.log();
}

function wait(date) {
  const currentDate = moment().format('ll LTS');
  sameLineLog(chalk`${currentDate} - {magenta ${date.fromNow()}}`);
}

function error(err) {
  section('Error', chalk.red(err.toString()), 'red');
  if (err.stack) console.log(chalk.red(err.stack));
}

module.exports = {
  section,
  sectionFn,
  sectionSameLine,
  welcome,
  stats,
  wait,
  error
};
