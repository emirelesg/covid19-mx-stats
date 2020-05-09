const UploadStats = require('./UploadStats');
const DownloadReports = require('./DownloadReports');
const PushToGit = require('./PushToGit');
const Movie = require('./Movie');

module.exports = [
  {
    name: 'Upload Stats',
    fn: UploadStats
  },
  {
    name: 'Movie',
    fn: Movie
  },
  {
    name: 'Push to Git',
    fn: PushToGit
  },
  {
    name: 'Download PDFs',
    fn: DownloadReports
  },
  {
    name: 'Push to Git',
    fn: PushToGit
  }
];
