const csv = require('csv-parser');
const fs = require('fs');

const file = '../../../data/2020-05-21/source/dataInput.csv';

fs.createReadStream(file)
  .pipe(csv())
  .on('data', (data) => {
    // console.log(data);
  })
  .on('error', (err) => console.error(err))
  .on('end', () => {});