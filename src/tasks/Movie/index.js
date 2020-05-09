const fs = require('fs');
const { exec } = require('child_process');
const chrome = require('selenium-webdriver/chrome');
const webdriver = require('selenium-webdriver');
const utils = require('../../utils/utils');
const config = require('../../config');

const { dryRun } = config.args;

// Deines the dimensions of the screenshot.
const width = config.screenshot.width * config.screenshot.scale;
const height = config.screenshot.height * config.screenshot.scale;
const scroll = Math.round(config.screenshot.scroll * config.screenshot.scale);
const scalePercent = Math.round(config.screenshot.scale * 100);

// Options for running a headless chrome.
const driverOptions = new chrome.Options()
  .headless()
  .windowSize({
    width,
    height
  })
  .addArguments(...config.proxyDriverArgs);

// Script to adjust the zoom level and scroll to area of interest.
const scrollScript = `
  document.body.style.zoom="${scalePercent}%";
  document.querySelector('header').style.display = 'none';
  var updateAlert = document.querySelector('#update-alert div button span i');
  if (updateAlert) updateAlert.click();
  window.scrollTo(0, ${scroll});
`;

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

async function takeScreenshot(log, driver, [i, screenshotPath]) {
  // Script used to click the tab.
  const script = `document.getElementsByClassName('v-tabs-bar__content')[0].getElementsByClassName('v-tab')[${i}].click();`;
  log(`Clicking tab #${i + 1}`);
  await driver.executeScript(script);

  // Wait for tab and content to change.
  await utils.delay(500);

  // Take screenshot and save file.
  const png = await driver.takeScreenshot();
  if (!dryRun) fs.writeFileSync(screenshotPath, png, 'base64');
  log(`Saved screenshot to ${screenshotPath}`);
  return true;
}

async function saveScreenshots(log, tabs) {
  const url = config.args.localhost || config.siteUrl;
  const driver = await new webdriver.Builder()
    .forBrowser('chrome')
    .setChromeOptions(driverOptions)
    .build();
  try {
    log(`Opening target ${url}`);
    await driver.get(url);
    log(`Waiting for element "${config.screenshot.waitFor}" to load`);
    await driver.wait(
      webdriver.until.elementLocated(
        webdriver.By.css(config.screenshot.waitFor)
      ),
      config.screenshot.timeout
    );

    // Scroll down to the area of interest.
    log(`Element ${config.screenshot.waitFor} loaded`);
    await driver.executeScript(scrollScript);
    await utils.delay(2000);

    // Make an screenshot for each tab.
    await tabs.reduce((previous, tab) => {
      return previous.then(() => takeScreenshot(log, driver, tab));
    }, Promise.resolve());
  } catch (err) {
    await driver.quit();
    throw err;
  }
  await driver.quit();
  return true;
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
  await saveScreenshots(log, tabs);

  // Save last screenshot as latest.
  if (!dryRun) {
    fs.copyFileSync(
      tabs[tabs.length - 1][1],
      utils.getFileByDate(today, config.files.screenshot)
    );
    log(
      `Saved screenshot to ${utils.getFileByDate(
        today,
        config.files.screenshot
      )}`
    );
    fs.copyFileSync(tabs[tabs.length - 1][1], utils.getLatestScreenshot());
    log(`Saved screenshot to ${utils.getLatestScreenshot()}`);
  }

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
  tabs.forEach(([, screenshotPath]) => {
    if (fs.existsSync(screenshotPath) && !dryRun) fs.unlinkSync(screenshotPath);
  });
  log(`Removed temporary screenshots`);

  return true;
};
