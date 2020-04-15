const PromiseFtp = require('promise-ftp');
const path = require('path');
const fs = require('fs');
const config = require('../../config');

function chainedUpload(ftp, files) {
  return new Promise((resolve, reject) => {
    // Allows for chaining promises.
    let chain = Promise.resolve();

    // Stores the path to all uploads that failed.
    const uploadErrors = [];

    files.forEach(({ local, remote }, i, arr) => {
      // Check that the file exists.
      const fullpath = path.resolve(local);
      if (fs.existsSync(fullpath) && fs.lstatSync(fullpath).isFile()) {
        // Upload files. Any errors are stored.
        chain = chain
          .then(() => {
            console.log(`OK uploading ${local} to ${remote}`);
            return ftp.put(fullpath, remote);
          })
          .catch(() => uploadErrors.push(local));
      } else {
        uploadErrors.push(local);
      }

      // After uploading the last file, resolve the promise.
      if (i === arr.length - 1)
        chain.then(() => {
          if (uploadErrors.length) {
            const message = `Failed to upload the following files:\n${uploadErrors.join(
              '\n'
            )}`;
            reject(new Error(message));
          } else {
            resolve(true);
          }
        });
    });
  });
}

module.exports = (files) => {
  return new Promise((resolve, reject) => {
    const ftp = new PromiseFtp();
    ftp
      .connect(config.ftp)
      .then(() => chainedUpload(ftp, files))
      .then(resolve)
      .catch(reject)
      .then(() => ftp.end());
  });
};
