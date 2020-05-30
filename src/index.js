const Service = require('./service');

const service = new Service();
console.clear();
service.start();
process.on('SIGINT', () => {
  console.log();
  service.stop();
  process.exit();
});
