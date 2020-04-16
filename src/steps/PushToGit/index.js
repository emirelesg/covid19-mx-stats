const git = require('simple-git/promise')();
const utils = require('../../utils');
const discord = require('../../config/discord');

module.exports = (date) =>
  new Promise((resolve, reject) => {
    const message = `updated stats for ${date.format('YYYY-MM-DD')}`;
    const dir = utils.getDirByDate(date);
    const dirRegex = new RegExp(dir, 'g');
    const latestFile = utils.getLatestStatsFile();
    git
      .checkIsRepo()
      .then((isRepo) => {
        if (!isRepo) throw new Error('Project is not a repo.');
      })
      .then(() => git.status())
      .then((status) => {
        const files = status.files
          .filter(
            (f, i, arr) =>
              (f.path.match(dirRegex) || f.path === latestFile) &&
              arr.indexOf(f) === i
          )
          .map((f) => f.path);
        if (files.length === 0) {
          console.log(`No files changed in ${dir} or ${latestFile}`);
        } else {
          console.log('OK the following files changed:');
          console.log(files);
        }
        return files;
      })
      .then((files) => git.add(files))
      .then(() => git.commit(message))
      .then(() => git.push('origin', 'master'))
      .then(() => console.log('OK pushed files to git'))
      .then(() => discord.send('Pushed to Git.'))
      .then(resolve)
      .catch(reject);
  });
