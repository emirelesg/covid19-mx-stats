const express = require('express');
const expressProxy = require('express-http-proxy');
const chrome = require('selenium-webdriver/chrome');
const webdriver = require('selenium-webdriver');
const config = require('../../config');
const utils = require('../../utils/utils');

class Proxy {
  constructor(url, port, lookFor, driverArgs, log) {
    this.url = new URL(url);
    this.port = port;
    this.lookFor = lookFor;
    this.driverArgs = driverArgs;
    this.log = log;
    this.driver = undefined;
    this.interceptedUrls = [];
    this.app = express();
    this.configure();
  }

  configure() {
    this.app.use(
      '/',
      expressProxy(this.url.origin, {
        userResDecorator: (_, proxyResData, userReq) => {
          this.interceptedUrls.push(userReq.url);
          if (userReq.url.match(this.lookFor)) {
            this.data = utils.makeStringSafe(proxyResData.toString('utf8'));
          }
          return proxyResData;
        }
      })
    );
  }

  async openWebsite() {
    const url = `http://127.0.0.1:${this.port}/`;
    const driverOptions = new chrome.Options()
      .headless()
      .addArguments(...this.driverArgs);
    this.driver = await new webdriver.Builder()
      .forBrowser('chrome')
      .setChromeOptions(driverOptions)
      .build();
    this.log(`Opening site ${url}`);
    return this.driver.get(url);
  }

  closeWebsite() {
    this.log(`Closing webdriver`);
    return this.driver ? this.driver.quit() : Promise.resolve();
  }

  waitForData(timeout) {
    this.log(`Waiting for data to be intercepted`);
    return new Promise((resolve, reject) => {
      let remaining = timeout;
      const interval = setInterval(() => {
        remaining -= 100;
        if (this.data) {
          this.log(`Data intercepted by proxy`);
          resolve(this.data);
          clearInterval(interval);
        } else if (remaining <= 100) {
          const urls = this.interceptedUrls.join('\n');
          reject(
            new Error(
              `Data was not intercepted by proxy\nProxy intercepted:\n${urls}`
            )
          );
          clearInterval(interval);
        }
      }, 100);
    });
  }

  start() {
    this.log(`Starting proxy at ${this.port}`);
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port);
      this.server.on('listening', resolve);
    });
  }

  stop() {
    this.log(`Closing proxy`);
    return new Promise((resolve) => {
      this.server.on('close', resolve);
      this.server.close();
    });
  }
}

module.exports = async (log) => {
  log(`Checking for redirects on ${config.proxyUrl}`);
  const requestUrl = await utils.followRedirects(config.proxyUrl);
  if (requestUrl !== config.proxyUrl) {
    log(`Redirected to ${requestUrl}`);
  }
  log(`Waiting 1000ms...`);
  await utils.delay(1000);

  this.proxy = new Proxy(
    requestUrl,
    config.proxyPort,
    config.proxyInterceptResource,
    config.proxyDriverArgs,
    log
  );

  try {
    await this.proxy.start();
    await this.proxy.openWebsite();
    const data = await this.proxy.waitForData(config.proxyTimeout);
    await this.proxy.closeWebsite();
    await this.proxy.stop();
    return data;
  } catch (err) {
    await this.proxy.closeWebsite();
    await this.proxy.stop();
    throw err;
  }
};
