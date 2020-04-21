const UploadStats = require('./UploadStats');
const Screenshot = require('./Screenshot');
const PushToGit = require('./PushToGit');

module.exports = [
  {
    name: '1/4 Upload Stats',
    fn: UploadStats
  },
  // {
  //   name: '2/4 Screenshot',
  //   fn: Screenshot
  // },
  // {
  //   name: '3/4 Download PDFs',
  //   fn: DownloadReports
  // },
  {
    name: '4/4 Push to Git',
    fn: PushToGit
  }
];
