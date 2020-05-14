const Service = require('./service');
const Status = require('./status');

const service = new Service();
const status = new Status();

console.clear();
status.start();
service.start();
process.on('SIGINT', () => {
  console.log();
  service.stop();
  status.stop();
  process.exit();
});
