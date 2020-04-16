const git = require('simple-git/promise')();
const utils = require('../../utils');
// const moment = require('moment');

module.exports = (date) =>
  new Promise((resolve, reject) => {
    const message = `updated stats for ${date.format('YYYY-MM-DD')}`;
    const dir = utils.getDirByDate(date);
    const dirRegex = new RegExp(dir, 'g');
    git
      .checkIsRepo()
      .then((isRepo) => {
        if (!isRepo) throw new Error('Project is not a repo.');
      })
      .then(() => git.status())
      .then((status) => {
        const files = status.files
          .filter((f, i, arr) => f.path.match(dirRegex) && arr.indexOf(f) === i)
          .map((f) => f.path);
        console.log(files);
        if (files.length === 0) throw new Error(`No files changed in ${dir}`);
        return files;
      })
      .then((files) => git.add(files))
      .then(() => git.commit(message))
      .then(() => git.push('origin', 'master', { '--dry-run': false }))
      .then(resolve)
      .catch(reject);
  });

// module.exports(moment()).then(console.log).catch(console.error);
