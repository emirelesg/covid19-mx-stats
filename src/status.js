const express = require('express');
const morgan = require('morgan');
const redis = require('redis');
const moment = require('moment');
const utils = require('./utils/utils');

class Status {
  constructor() {
    this.log = utils.print.sectionFn('Status', 'magenta');
    this.redisClient = redis.createClient();
    this.redisClient.on('connect', () =>
      this.log(`Connected to redis server at ${this.redisClient.address}`)
    );
    this.app = express();
    this.app.use(morgan('combined'));
    this.app.get('/', (req, res) => {
      this.redisClient.hgetall('status', (err, obj) => {
        if (err) {
          res.status(500).send({ err });
        } else {
          res.send({ ...obj, heartbeat: moment(obj.heartbeat).fromNow() });
        }
      });
    });
    this.server = undefined;
    this.port = process.env.PORT || 3000;
  }

  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        this.log(`Started status server at port ${this.port}`);
        return resolve(true);
      });
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.log(`Stopped status server`);
    }
    if (this.redisClient.connected) {
      this.redisClient.quit();
      this.log(`Closed redis client`);
    }
  }
}

const server = new Status();
server.start();
process.on('SIGINT', () => {
  console.log();
  server.stop();
  process.exit();
});
