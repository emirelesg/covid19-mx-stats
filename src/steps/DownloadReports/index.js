const fs = require('fs');
const utils = require('../../utils');
const config = require('../../config');

function chainedDownload(queue, today) {
  return new Promise((resolve, reject) => {
    const downloadErrors = [];
    let chain = Promise.resolve();
    queue.forEach(({ name, url }, i, arr) => {
      const fullpath = utils.getFileByDate(today, name);
      if (!fs.existsSync(fullpath)) {
        chain = chain
          .then(() => utils.delay(config.downloadWaitTime))
          .then(() => utils.download(url, fullpath))
          .then(() => console.log(`OK downloaded to ${fullpath}`))
          .catch(() => downloadErrors.push(name));
      } else {
        console.log(`OK already downloaded ${fullpath}`);
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

module.exports = (today) =>
  new Promise((resolve, reject) => {
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
            url
          };
        })
      )
      .then((queue) => chainedDownload(queue, today))
      .then(resolve)
      .catch(reject);
  });
