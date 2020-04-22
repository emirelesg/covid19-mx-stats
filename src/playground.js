const fs = require('fs');
const moment = require('moment');
const parse = require('csv-parse/lib/sync');
const utils = require('./utils/utils');
const config = require('./config');

const today = moment('2020-04-21');
const csvFile = utils.getSourceCsvByDate(today);
const rows = parse(fs.readFileSync(csvFile, 'utf-8'), {
  columns: true
});
const activeThresh = today.clone().subtract('14', 'days');

const startOfSymptomsMap = {};

rows.forEach((data) => {
  // State where the case was reported.
  const reportedState = data.ENTIDAD_UM;
  const stateKey = config.stateKeys[parseInt(reportedState, 10)];

  // Status of the patient.
  const result = parseInt(data.RESULTADO, 10);
  const isInfected = result === 1;
  const isNotInfected = result === 2;
  const isSuspected = result === 3;
  const isDeceased = data.FECHA_DEF !== '9999-99-99';

  // Start of Symptoms
  const startOfSymptoms = moment(data.FECHA_SINTOMAS);
  const isActive = startOfSymptoms.isAfter(activeThresh);

  // Only process recognized states.
  if (stateKey) {
    if (isInfected) {
      // Map when infected people started with symptoms.
      if (startOfSymptomsMap[data.FECHA_SINTOMAS]) {
        startOfSymptomsMap[data.FECHA_SINTOMAS] += 1;
      } else {
        startOfSymptomsMap[data.FECHA_SINTOMAS] = 1;
      }

      if (isActive) {
        //
      }
      if (isDeceased) {
        //
      }
    } else if (isSuspected) {
      //
    } else if (isNotInfected) {
      //
    } else {
      console.log(`Unknown result ${data.RESULTADO}`);
    }
  } else {
    console.log(`Unknown state ${reportedState}`);
  }
});

Object.entries(startOfSymptomsMap)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .forEach((s) => console.log(`${s[0]}, ${s[1]}`));
