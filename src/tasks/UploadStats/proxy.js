const proxy = require('express-http-proxy');
const app = require('express')();
const chrome = require('selenium-webdriver/chrome');
const webdriver = require('selenium-webdriver');
const { once } = require('events');
const { makeStringSafe } = require('../../utils/utils');
const config = require('../../config');

// Stores the configured urls for proxy and remote.
const remoteUrl = new URL(config.proxyUrl);
const localUrl = new URL(
  remoteUrl.pathname,
  `http://localhost:${config.proxyPort}`
);

// Options for running a headless chrome.
const driverOptions = new chrome.Options()
  .headless()
  .addArguments(...config.proxyDriverArgs);

// Where the incercepted data will be stored.
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
      }
      return proxyResData;
    }
  })
);

async function openResource(log) {
  const driver = await new webdriver.Builder()
    .forBrowser(config.proxyBrowser)
    .setChromeOptions(driverOptions)
    .build();
  try {
    log(`Opening target ${remoteUrl.href}`);
    await driver.get(localUrl.href);
    log(`Waiting for element "${config.proxyWaitFor}" to load`);
    await driver.wait(
      webdriver.until.elementLocated(webdriver.By.css(config.proxyWaitFor)),
      config.proxyTimeout
    );
    log(`Element "${config.proxyWaitFor}" loaded`);
  } finally {
    await driver.quit();
  }
}

function processData(log) {
  if (rawData) {
    log(`Data intercepted!`);
    log(`Processing intercepted data`);
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
        throw new Error(`Unknown state data format: ${rawState}`);
      }
    });
    return o;
  }
  throw new Error(`Data was not intercepted by the proxy`);
}

module.exports = async (log) => {
  const server = app.listen(config.proxyPort);
  log(`Starting proxy at ${localUrl.href}`);
  await once(server, 'listening');
  await openResource(log);
  server.close();
  return processData(log);
};
