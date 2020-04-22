const chrome = require('selenium-webdriver/chrome');
const webdriver = require('selenium-webdriver');
const fs = require('fs');
const config = require('../../config');
const utils = require('../../utils/utils');

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
  document.querySelector('#update-alert div button span i').click();
  window.scrollTo(0, ${scroll});
`;

// Saves the screenshot to the correct folder.
// TODO: only write to the latest file if it is really the latest.
function saveScreenshot(log, date, png) {
  const files = [
    utils.getFileByDate(date, config.files.screenshot),
    utils.getLatestScreenshot()
  ];
  files.forEach((file) => {
    if (!dryRun) fs.writeFileSync(file, png, 'base64');
    log(`Saved screenshot to ${file}`);
  });
}

// Open the provided url and make a screenshot.
module.exports = async (log, today, yesterday, script) => {
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
    log(`Element ${config.screenshot.waitFor} loaded`);
    await driver.executeScript(scrollScript + script);
    await utils.delay(2000);
    const png = await driver.takeScreenshot();
    log(`Took screenshot`);
    saveScreenshot(log, today, png);
  } catch (err) {
    await driver.quit();
    throw err;
  }
  await driver.quit();
  return true;
};

if (!module.parent) {
  const moment = require('moment');
  const fs = require('fs');
  const today = moment(config.args.date || '2020-01-01');
  if (config.args.gif) {
    [0, 1, 2, 3]
      .reduce((previous, i) => {
        console.log();
        const s = `document.getElementsByClassName('v-tabs-bar__content')[0].getElementsByClassName('v-tab')[${i}].click();`;
        return previous
          .then(() =>
            module.exports(
              utils.print.sectionFn(`sc-${i}`, 'cyan'),
              today,
              undefined,
              s
            )
          )
          .then(() =>
            fs.copyFileSync(
              utils.getFileByDate(today, config.files.screenshot),
              utils.getFileByDate(today, `Screenshot-${i}.png`)
            )
          );
      }, Promise.resolve())
      .then(() =>
        fs.unlinkSync(utils.getFileByDate(today, config.files.screenshot))
      );
  } else {
    module.exports(console.log, today).then(console.log).catch(console.error);
  }
}
