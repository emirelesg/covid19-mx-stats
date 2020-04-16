const chrome = require('selenium-webdriver/chrome');
const webdriver = require('selenium-webdriver');
const fs = require('fs');
const moment = require('moment');
const config = require('../../config');
const discord = require('../../config/discord');
const utils = require('../../utils');
const args = require('../../config/args');

const width = config.screenshot.width * config.screenshot.scale;
const height = config.screenshot.height * config.screenshot.scale;
const scroll = Math.round(config.screenshot.scroll * config.screenshot.scale);
const scalePercent = Math.round(config.screenshot.scale * 100);

// Script to adjust the zoom level and scroll to area of interest.
const script = `
  document.body.style.zoom="${scalePercent}%";
  window.scrollTo(0, ${scroll});
`;

async function makeScreenshot(date, url) {
  const files = [
    utils.getFileByDate(date, config.files.screenshot),
    utils.getLatestScreenshotFile()
  ];
  const driverOptions = new chrome.Options()
    .headless()
    .windowSize({
      width,
      height
    })
    .addArguments(...config.proxyDriverArgs);
  const driver = await new webdriver.Builder()
    .forBrowser(config.proxyBrowser)
    .setChromeOptions(driverOptions)
    .build();
  try {
    await driver.get(url || config.siteUrl);
    console.log(`OK opened ${url || config.siteUrl}`);
    await driver.wait(
      webdriver.until.elementLocated(
        webdriver.By.css(config.screenshot.waitFor)
      ),
      config.screenshot.timeout
    );
    console.log(`OK element ${config.screenshot.waitFor} loaded`);
    await driver.executeScript(script);
    const png = await driver.takeScreenshot();
    console.log(`OK took screenshot`);

    // Write screenshot to all locations.
    files.forEach((file) => {
      fs.writeFileSync(file, png, 'base64');
      console.log(`OK saved screenshot to ${file}`);
    });
  } catch (err) {
    await driver.quit();
    throw err;
  }
  await driver.quit();
  return true;
}

module.exports = (date, url) =>
  new Promise((resolve, reject) => {
    makeScreenshot(date, url)
      .then(() => discord.send('Took screenshot.'))
      .then(resolve)
      .catch(reject);
  });

if (!module.parent) {
  const date = args.date ? moment(args.date) : moment();
  const url = args.localhost || config.siteUrl;
  console.log(`Making screenshot for ${date.format('LL')}`);
  module.exports(date, url).then(console.log).catch(console.error);
}
