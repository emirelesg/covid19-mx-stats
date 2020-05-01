const fs = require('fs');
const { exec } = require('child_process');
const Screenshot = require('../Screenshot');
const utils = require('../../utils/utils');
const config = require('../../config');

const { dryRun } = config.args;

function execShellCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout || stderr);
      }
    });
  });
}

module.exports = async (log, today, yesterday) => {
  // Paths used.
  const screenshotsPath = utils.getFileByDate(
    today,
    config.files.screenshotsWildcard
  );
  const moviePath = utils.getFileByDate(today, config.files.movie);

  // Tab indexes form 4 - 0.
  const tabs = Array(5)
    .fill()
    .map((_, i) => [i, screenshotsPath.replace('*', i)])
    .reverse();

  // Make an array with recuding sequential numbers starting from 4.
  await tabs.reduce((previous, [i, screenshotPath]) => {
    // Script to click a tab.
    const script = `document.getElementsByClassName('v-tabs-bar__content')[0].getElementsByClassName('v-tab')[${i}].click();`;
    // Return last promise and execute.
    return previous
      .then(() => {
        // When last promise finishes take screenshot.
        log(`Screenshot for tab #${i + 1}`);
        return Screenshot(log, today, yesterday, script);
      })
      .then(() => {
        // After screenshot copy file.
        const from = utils.getFileByDate(today, config.files.screenshot);
        if (!dryRun) fs.copyFileSync(from, screenshotPath);
        log(`Copied screenshot to ${screenshotPath}`);
      });
  }, Promise.resolve());

  // Delete previous movie.
  if (fs.existsSync(moviePath) && !dryRun) fs.unlinkSync(moviePath);

  // Execute ffmpeg to join images in a mp4 file.
  if (!dryRun) {
    await execShellCommand(
      `ffmpeg -framerate 1 -pattern_type glob -i '${screenshotsPath}' -c:v libx264 -r 30 -pix_fmt yuv420p ${moviePath}`
    );
  }
  log(`Saved movie to ${moviePath}`);

  // Remove temporary screenshots.
  tabs.forEach(([_, screenshotPath]) => {
    if (fs.existsSync(screenshotPath) && !dryRun) fs.unlinkSync(screenshotPath);
  });
  log(`Removed temporary screenshots`);

  return true;
};
