const schedule = require('node-schedule');
const moment = require('moment');
const config = require('./config');
const utils = require('./utils');
const args = require('./config/args');
const UploadStats = require('./steps/UploadStats');
const DownloadReports = require('./steps/DownloadReports');
const PushToGit = require('./steps/PushToGit');
const Screenshot = require('./steps/Screenshot');
const discord = require('./config/discord');

class Service {
  constructor() {
    this.completed = undefined;
    this.today = undefined;
    this.yesterday = undefined;
    this.retries = 0;
    this.mainJobInterval = '7 19 * * *';
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
    console.clear();
    console.log(
      utils.print.welcome(
        this.today,
        this.retries,
        this.completed,
        discord.isReady
      )
    );
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
      c[2] = await utils.step(
        3,
        'Take Screenshot.',
        c[2],
        Screenshot,
        this.today
      );
      c[3] = await utils.step(4, 'Push to Git.', c[3], PushToGit, this.today);
      await discord.send(`Success!`);
      this.completed = this.today;
    } catch (err) {
      this.retries += 1;
      utils.print.error(err);
      await discord.send(err.toString());
      await discord.send(`Waiting ${config.retryTimeout} seconds...`);
      await utils.countdownPromise(config.retryTimeout);
      await this.onWork(c);
    }
  }

  async onSync() {
    this.stop();
    this.today = args.date ? moment(args.date) : moment();
    this.yesterday = moment(this.today).subtract(1, 'day');
    await discord.send(`Started to update for ${this.today.format('LL')}`);
    await this.onWork([false, false, false, false]);
    if (!args.date) {
      this.start();
    } else {
      await discord.stop();
    }
  }

  onWait() {
    const { _date } = this.mainJob.nextInvocation();
    const welcome = utils.print.welcome(
      this.today,
      this.retries,
      this.completed,
      discord.isReady
    );
    const countdown = utils.print.wait(_date);
    utils.print.sameLine(`${welcome}\n${countdown}`);
  }

  stop() {
    this.waitJob.cancel();
    this.mainJob.cancel();
  }

  start() {
    this.today = undefined;
    this.yesterday = undefined;
    this.retries = 0;
    if (args.date) {
      this.onSync();
    } else {
      this.mainJob.reschedule(this.mainJobInterval);
      this.waitJob.reschedule(this.waitJobInterval);
    }
  }
}

const service = new Service();
console.clear();
service.start();

process.on('SIGINT', () => {
  console.log();
  utils.print.section('Stop', 'Cancelling all operations', 'bgRed');
  service.stop();
  console.log(`OK stoped service`);
  discord
    .stop()
    .then(() => {
      console.log(`OK stopped discord bot`);
      console.log(`Goodbye!`);
      process.exit();
    })
    .catch((err) => {
      utils.print.error(err);
      process.exit();
    });
});
