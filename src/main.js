const fs = require('fs');
const getStateInfo = require('./getStateInfo');
const utils = require('./utils');
const deploy = require('./deploy');
const config = require('./config');

const { today, yesterday } = utils.getDates();
const state = {
  statsUploaded: false,
  reportsDownloaded: false,
};

function areStatsDifferent(latest, prev) {
  const latestTimeseries = latest.timeseries[latest.timeseries.length - 1];
  const prevTimeseries = prev.timeseries[prev.timeseries.length - 1];
  return (
    latestTimeseries.confirmed !== prevTimeseries.confirmed &&
    latestTimeseries.suspected !== prevTimeseries.suspected &&
    latestTimeseries.deaths !== prevTimeseries.deaths
  );
}

function saveStatsFile(stats) {
  utils.makeFolder(utils.getDirByDate(today));
  [utils.getStatsFileByDate(today), utils.getLatestStatsFile()].forEach(
    (file) => {
      console.log(`OK stats written to ${file}.`);
      utils.saveJSON(file, stats);
    }
  );
}

function uploadStatsFile() {
  return new Promise((resolve, reject) => {
    getStateInfo()
      .then((statesInfo) => {
        const prevStatsObj = utils.readJSON(
          utils.getStatsFileByDate(yesterday)
        );
        const latestStatsObj = utils.makeStats(prevStatsObj, statesInfo);
        if (areStatsDifferent(latestStatsObj, prevStatsObj))
          return latestStatsObj;
        throw new Error(`stats look to be the same from yesterday.`);
      })
      .then((latestStatsObj) => saveStatsFile(latestStatsObj))
      .then(deploy)
      .then(resolve)
      .catch(reject);
  });
}

function chainedDownload(queue) {
  return new Promise((resolve, reject) => {
    const downloadErrors = [];
    let chain = Promise.resolve();
    queue.forEach(({ name, url }, i, arr) => {
      const fullpath = utils.getFileByDate(today, name);

      if (!fs.existsSync(fullpath)) {
        chain = chain
          .then(() => utils.delay(1000))
          .then(() => utils.download(url, fullpath))
          .then(() => console.log(`OK downloaded to ${fullpath}`))
          .catch(() => downloadErrors.push(name));
      } else {
        console.log(`${fullpath} is already downloaded.`);
      }

      if (i === arr.length - 1) {
        chain.then(() => {
          if (downloadErrors.length) {
            const message = `Failed to download the following files:\n${downloadErrors.join(
              '\n'
            )}`;
            reject(new Error(message));
          } else {
            resolve(true);
          }
        });
      }
    });
  });
}

function downloadReports() {
  return new Promise((resolve, reject) => {
    const datePattern = new RegExp(today.format(config.reportDatePattern), 'g');
    console.log(`OK started downloading reports`);
    utils
      .getLinks(config.reportsUrl)
      .then((links) =>
        links.filter((l) => l.match(/.pdf/g) && l.match(datePattern))
      )
      .then((links) =>
        config.reports.map((report) => {
          const url = links.find((l) =>
            utils.makeStringSafe(l).match(report.pattern)
          );
          if (url) {
            console.log(`OK link found for ${report.name}`);
          } else {
            throw new Error(`Could not find link for ${report.name}`);
          }
          return {
            ...report,
            url,
          };
        })
      )
      .then(chainedDownload)
      .then(resolve)
      .catch(reject);
  });
}

async function init() {
  console.clear();
  try {
    // Upload stats.
    if (!state.statsUploaded) {
      state.statsUploaded = await uploadStatsFile();
    } else {
      console.log(`OK stats already uploaded.`);
    }

    // Download reports.
    if (!state.reportsDownloaded) {
      state.reportsDownloaded = await downloadReports();
    } else {
      console.log(`OK reports already downloaded`);
    }

    // Wrap up.
    console.log(`DONE!`);
  } catch (err) {
    console.error(err);
    utils.countdown(10, init);
  }
}

init();
