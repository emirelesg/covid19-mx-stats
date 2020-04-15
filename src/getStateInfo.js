const proxy = require('express-http-proxy');
const app = require('express')();
const chrome = require('selenium-webdriver/chrome');
const webdriver = require('selenium-webdriver');
const { makeStringSafe } = require('./utils');
const config = require('./config');

const remoteUrl = new URL(config.proxyUrl);
const localUrl = new URL(
  remoteUrl.pathname,
  `http://localhost:${config.proxyPort}`
);
let rawData;

app.use(
  '/',
  proxy(remoteUrl.origin, {
    userResDecorator: (_, proxyResData, userReq) => {
      // If request matches to the request of interest, then intercept
      // the data and store it.
      if (userReq.url.match(config.proxyInterceptResource)) {
        const response = proxyResData.toString('utf8');
        rawData = response;
        console.log(`OK data intercepted!`);
      }
      return proxyResData;
    },
  })
);

async function openResource() {
  const driverOptions = new chrome.Options()
    .headless()
    .addArguments(...config.proxyDriverArgs);
  const driver = await new webdriver.Builder()
    .forBrowser(config.proxyBrowser)
    .setChromeOptions(driverOptions)
    .build();
  try {
    await driver.get(localUrl.href);
    await driver.wait(
      webdriver.until.elementLocated(webdriver.By.css(config.proxyWaitFor)),
      config.proxyTimeout
    );
  } finally {
    await driver.quit();
  }
}

function processData() {
  if (rawData) {
    const o = { confirmed: {}, suspected: {}, deaths: {} };
    JSON.parse(JSON.parse(rawData).d).forEach((rawState) => {
      if (rawState.length >= 8) {
        const stateMatch = config.states.find((statePattern) =>
          makeStringSafe(rawState[1]).match(statePattern[3])
        );
        if (stateMatch) {
          o.confirmed[stateMatch[0]] = parseInt(rawState[4], 10);
          o.suspected[stateMatch[0]] = parseInt(rawState[6], 10);
          o.deaths[stateMatch[0]] = parseInt(rawState[7], 10);
        }
      } else {
        throw new Error(`Uknown state data format: ${rawState}`);
      }
    });
    return o;
  }
  throw new Error(`Data not found.`);
}

function init() {
  return new Promise((resolve, reject) => {
    const server = app.listen(config.proxyPort);
    server.on('listening', () => {
      openResource()
        .then(processData)
        .then(resolve)
        .catch(reject)
        .then(() => server.close());
    });
    server.on('error', reject);
  });
}

// Export init function.
// If the module is ran as a ascript then execute the init function.
module.exports = init;
if (!module.parent) {
  init().then(console.log).catch(console.error);
}
