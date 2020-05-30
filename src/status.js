const express = require('express');
const utils = require('./utils/utils');

class Status {
  constructor() {
    this.log = utils.print.sectionFn('Status', 'magenta');
    this.app = express();
    this.app.get('/', (req, res) => {
      const { timeseries } = utils.readJSON(utils.getLatestStats());
      const latest = timeseries.slice(-1);
      res.send(latest[0]);
    });
    this.server = undefined;
  }

  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(80, () => {
        this.log(`Started status server at port ${80}`);
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

module.exports = Status;
