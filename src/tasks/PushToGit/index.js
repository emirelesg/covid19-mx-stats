const git = require('simple-git/promise')();
const utils = require('../../utils/utils');
const config = require('../../config');

const { dryRun } = config.args;

module.exports = async (log, date) => {
  const message = `updated stats for ${date.format('YYYY-MM-DD')}`;
  const dir = utils.getDirByDate(date);
  const dirRegex = new RegExp(dir, 'g');
  const latestFile = utils.getLatestStatsFile();
  const latestScreenshot = utils.getLatestScreenshotFile();

  const isRepo = await git.checkIsRepo();
  if (!isRepo) throw new Error('Project is not a repo.');

  const status = await git.status();
  const files = status.files
    .filter(
      (f, i, arr) =>
        (f.path.match(dirRegex) ||
          f.path === latestFile ||
          f.path === latestScreenshot) &&
        arr.indexOf(f) === i
    )
    .map((f) => f.path);

  if (files.length === 0) {
    log(`No files changed in ${dir} or ${latestFile}`);
  } else {
    log('OK the following files changed:');
    log(files);
    if (!dryRun) {
      await git.add(files);
      await git.commit(message);
      await git.push('origin', 'master');
      if (files.length > 0) {
        log('OK pushed files to git');
      }
    }
  }

  return true;
};
