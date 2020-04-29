const UploadStats = require('./UploadStats');
const Screenshot = require('./Screenshot');
const DownloadReports = require('./DownloadReports');
const PushToGit = require('./PushToGit');

module.exports = [
  {
    name: 'Upload Stats',
    fn: UploadStats
  },
  {
    name: 'Screenshot',
    fn: Screenshot
  },
  // {
  //   name: 'Download PDFs',
  //   fn: DownloadReports
  // },
  {
    name: 'Push to Git',
    fn: PushToGit
  }
];
