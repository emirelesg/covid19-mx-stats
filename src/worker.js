const schedule = require('node-schedule');
const moment = require('moment');
const redis = require('redis');
const config = require('./config');
const utils = require('./utils/utils');
const tasks = require('./tasks');

class Service {
  constructor() {
    this.log = utils.print.sectionFn('Service', 'magenta');
    this.asService = !config.args.date;
    this.redisClient = redis.createClient();
    this.redisClient.on('connect', () => {
      this.log(`Connected to redis server at ${this.redisClient.address}`);
      if (this.asService) {
        this.redisClient.del('status', () => {
          this.redisClient.hset('status', 'isUpdating', 0);
          this.redisClient.hset('status', 'isWaiting', 0);
          this.redisClient.hset('status', 'heartbeat', '');
          this.redisClient.hset('status', 'retries', 0);
          this.redisClient.hset('status', 'lastUpdate', '');
          this.redisClient.hset('status', 'remaining', '');
        });
      }
    });
    this.today = undefined;
    this.yesterday = undefined;
    this.retries = 0;
    this.mainJobInterval = '00 21 * * *';
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

  // Main worker.
  // Performs tasks in sequence. All tasks depend on previous tasks.
  // If a task is executed successfully it is no longer executed.
  // If any task failes, a countdown will start and the main worker
  // is started again.
  async onWork(completed) {
    this.redisClient.hset('status', 'retries', this.retries);
    utils.print.welcome();
    utils.print.stats(this.today, this.retries);
    this.log('Started tasks');
    const c = completed ? [...completed] : Array(tasks.length).fill(false);
    try {
      await tasks.reduce(
        (previous, task, i) =>
          previous.then(() =>
            utils
              .execTask(
                i + 1,
                `${i + 1}/${tasks.length} ${task.name}`,
                c[i],
                task.fn,
                this.today,
                this.yesterday
              )
              .then((result) => {
                c[i] = result;
                // Clear line after each task.
                console.log();
              })
          ),
        Promise.resolve()
      );
      this.log('All tasks completed!');
    } catch (err) {
      this.retries += 1;
      utils.print.error(err);
      await utils.countdownPromise(config.retryTimeout);
      await this.onWork(c);
    }
  }

  // Function called once a day to start the main worker.
  // Disables any other callbacks and continues normal execution when
  // main worker finishes.
  async onSync() {
    this.stop();
    this.redisClient.hset('status', 'isWaiting', '0');
    this.redisClient.hset('status', 'isUpdating', '1');
    // Clear line after stoping wait job.
    if (this.asService) console.log();
    // Get dates.
    this.today = config.args.date ? moment(config.args.date) : moment();
    this.yesterday = moment(this.today).subtract(1, 'day');
    // Start work. Will only resolve on success.
    this.retries = 0;
    await this.onWork();
    this.redisClient.hset(
      'status',
      'lastUpdate',
      this.today.format(config.outputDatePattern)
    );
    this.redisClient.hset('status', 'isUpdating', '0');
    if (this.asService) {
      // Restart everything again.
      this.start();
    } else {
      this.exit();
    }
  }

  // Displays the amount of time to wait until the
  // main worker starts.
  onWait() {
    const { _date } = this.mainJob.nextInvocation();
    utils.print.wait(_date);
    this.redisClient.hset('status', 'remaining', _date.fromNow());
    this.redisClient.hset('status', 'heartbeat', moment().toISOString());
    this.redisClient.hset('status', 'isWaiting', '1');
  }

  // Stops all jobs.
  stop() {
    this.log(`Stopping cron jobs.`);
    this.waitJob.cancel();
    this.mainJob.cancel();
  }

  // Stops jobs and redis client.
  exit() {
    this.stop();
    if (this.redisClient.connected) {
      this.redisClient.hset('status', 'remaining', '', () => {
        this.redisClient.quit();
        this.log(`Closed redis client`);
      });
    }
  }

  // Starts all jobs. Sets the initial conditions.
  start() {
    this.today = undefined;
    this.yesterday = undefined;
    this.retries = 0;
    if (config.args.date) {
      this.onSync();
    } else {
      this.mainJob.reschedule(this.mainJobInterval);
      this.waitJob.reschedule(this.waitJobInterval);
      utils.print.welcome();
    }
  }
}

const service = new Service();
console.clear();
service.start();
process.on('SIGINT', () => {
  console.log();
  service.exit();
  process.exit();
});
