var Promise = require('bluebird');
var Boom = require('boom');
var fs = require('fs');
var mkdirp = Promise.promisifyAll(require('mkdirp'));
var Path = require('path');

var internals = {};
var uploads = {};

internals.copyFile = function(src, dest) {

  return new Promise(function(resolve, reject) {

    fs.createReadStream(src)
      .pipe(fs.createWriteStream(dest))
      .on('finish', resolve)
      .on('error', reject);
  });

};

internals.move = function(file) {

  return mkdirp.mkdirpAsync(file.dir)
    .then(function() {
      return internals.copyFile(file.src, Path.join(file.dir, file.filename));
    })
    .then(function() {
      fs.unlinkAsync(file.src)
        .catch(console.log);
    })
    .then(function() {
      return Path.join(file.collection, file.filename);
    });
};

internals.getName = function(baseDir, key, file) {

  return {
    collection: key,
    dir: Path.join(baseDir, key),
    filename: file.filename,
    src: file.path,
    metadata: file
  };
};

uploads.storeStream = function(path, stream) {

  mkdirp.mkdirpAsync(Path.dirname(path))
    .then(function() {
      stream.pipe(fs.createWriteStream(path));
    });
};

uploads.preparePayload = function(baseDir, payload) {

  var files = [];

  var key;

  for(key in payload) {

    if (Array.isArray(payload[key])) {

      payload[key].forEach(function(file) {
        files.push(internals.getName(baseDir, key, file));
      });

    } else {
      files.push(internals.getName(baseDir, key, payload[key]));
    }
  }

  return files;
};

uploads.uploadFilePayload = function(baseDir, payload) {
  
  var files = this.preparePayload(baseDir, payload);

  var promises = [];

  files.forEach(function(upload) {

    if (!upload.metadata || !upload.metadata.headers || !upload.metadata.headers['content-type']) {
      throw Boom.badRequest();
    }

    var file = {}; 

    file.path = internals.move(upload);

    file.metadata = {
      contentType: upload.metadata.headers['content-type'],
      filename: upload.metadata.filename,
      bytes: upload.metadata.bytes
    };

    promises.push(Promise.props(file));
  });

  return Promise.all(promises);
};

module.exports = uploads;
