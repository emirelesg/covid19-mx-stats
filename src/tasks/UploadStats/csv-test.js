const parse = require('csv-parse');
const parseSync = require('csv-parse/lib/sync');
const utils = require('../../utils/utils');
const moment = require('moment');
const fs = require('fs');
const v8 = require('v8');

function heap() {
	console.log(
		`${Math.floor(v8.getHeapStatistics().total_available_size / 1024 / 1024)}MB`
	);
}

const today = moment('2020-05-12');
const csvFile = utils.getSourceCsvByDate(today);

heap();

/*
const data = parseSync(fs.readFileSync(csvFile, 'utf-8'), {
	columns: true
})
*/

fs.createReadStream(csvFile).pipe()

heap();


