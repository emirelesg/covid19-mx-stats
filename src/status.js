const express = require('express');
const morgan = require('morgan');
const utils = require('./utils/utils');

class Status {
  constructor() {
    this.log = utils.print.sectionFn('Status', 'magenta');
    this.app = express();
    this.app.use(morgan('combined'));
    this.app.get('/', (req, res) => {
      const { timeseries } = utils.readJSON(utils.getLatestStats());
      const latest = timeseries.slice(-1);
      res.send(latest[0]);
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
      this.log(`Stoped status server`);
    }
  }
}

const server = new Status();
server.start();
process.on('SIGINT', () => {
  server.stop();
});
