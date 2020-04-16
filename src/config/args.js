const { ArgumentParser } = require('argparse');

const parser = new ArgumentParser({
  version: '1.0.0',
  addHelp: true,
  description: 'Uploads COVID-19 stats file automatically.'
});

parser.addArgument(['-d', '--date'], {
  help: 'date to work on',
  required: false
});

parser.addArgument(['-l', '--localhost'], {
  help: 'use localhost for screenshots',
  required: false
});

module.exports = parser.parseArgs();
