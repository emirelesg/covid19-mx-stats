const schedule = require('node-schedule');
const moment = require('moment');
const config = require('./config');
const utils = require('./utils');
const args = require('./config/args');
const UploadStats = require('./steps/UploadStats');
const DownloadReports = require('./steps/DownloadReports');

class Service {
  constructor() {
    this.completed = undefined;
    this.today = undefined;
    this.yesterday = undefined;
    this.retries = 0;
    this.mainJobInterval = '*/10 * * * * *';
    this.waitJobInterval = '* * * * * *';
    this.mainJob = schedule.scheduleJob(
      this.mainJobInterval,
      this.onSync.bind(this)
    );
    this.waitJob = schedule.scheduleJob(
      this.waitJobInterval,
      this.onWait.bind(this)
    );
    this.stop();
  }

  async onWork(completed) {
    const c = [...completed];
    utils.print.welcome(this.today, this.retries, this.completed);
    try {
      c[0] = await utils.step(
        1,
        'Upload stats file.',
        c[0],
        UploadStats,
        this.today,
        this.yesterday
      );
      c[1] = await utils.step(
        2,
        'Download Reports.',
        c[1],
        DownloadReports,
        this.today
      );
      this.completed = this.today;
    } catch (err) {
      this.retries += 1;
      utils.print.error(err);
      await utils.countdownPromise(config.retryTimeout);
      await this.onWork(c);
    }
  }

  async onSync() {
    this.stop();
    this.today = args.date ? moment(args.date) : moment();
    this.yesterday = moment(this.today).subtract(1, 'day');
    await this.onWork([false, false]);
    if (!args.date) this.start();
  }

  onWait() {
    const { _date } = this.mainJob.nextInvocation();
    utils.print.wait(_date);
  }

  stop() {
    this.waitJob.cancel();
    this.mainJob.cancel();
  }

  start() {
    this.today = undefined;
    this.yesterday = undefined;
    this.retries = 0;
    utils.print.welcome(this.today, this.retries, this.completed);
    if (args.date) {
      this.onSync();
    } else {
      this.mainJob.reschedule(this.mainJobInterval);
      this.waitJob.reschedule(this.waitJobInterval);
    }
  }
}

const service = new Service();
service.start();
