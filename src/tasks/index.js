const UploadStats = require('./UploadStats');
const DownloadReports = require('./DownloadReports');
const Screenshot = require('./Screenshot');
const PushToGit = require('./PushToGit');

module.exports = [
  {
    name: '1/4 Upload Stats',
    fn: UploadStats
  },
  {
    name: '2/4 Download PDFs',
    fn: DownloadReports
  },
  {
    name: '3/4 Screenshot',
    fn: Screenshot
  },
  {
    name: '4/4 Push to Git',
    fn: PushToGit
  }
];
