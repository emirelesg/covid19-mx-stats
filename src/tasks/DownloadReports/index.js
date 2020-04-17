const fs = require('fs');
const utils = require('../../utils/utils');
const config = require('../../config');

const { dryRun } = config.args;

// Download file if it does not exist.
// Wait before downloading to avoid suspicion.
async function delayedDownload(log, url, fullpath) {
  if (!fs.existsSync(fullpath)) {
    log(`Waiting ${config.downloadWaitTime}ms...`);
    await utils.delay(config.downloadWaitTime);
    if (!dryRun) await utils.download(url, fullpath);
    log(`Downloaded to ${fullpath}`);
  } else {
    log(`Already downloaded ${fullpath}`);
  }
  return true;
}

// Sequentially download all files.
async function chainedDownload(log, queue, today) {
  return queue.reduce(
    (previous, { name, url }) =>
      previous.then(() => {
        const fullpath = utils.getFileByDate(today, name);
        return delayedDownload(log, url, fullpath);
      }),
    Promise.resolve()
  );
}

module.exports = async (log, today) => {
  const datePattern = new RegExp(today.format(config.reportDatePattern), 'g');
  log(`Started downloading reports`);

  const links = await utils.getLinks(config.reportsUrl);
  const reports = config.reports.map((report) => {
    const url = links.find(
      (l) =>
        utils.makeStringSafe(l).match(report.pattern) &&
        l.match(/.pdf/g) &&
        l.match(datePattern)
    );
    if (url) {
      log(`Link found for ${report.name}`);
    } else {
      throw new Error(`Could not find link for ${report.name}`);
    }
    return {
      ...report,
      url
    };
  });

  await chainedDownload(log, reports, today);
  return true;
};
