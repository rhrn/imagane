var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();

var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var expect = Code.expect;

var Path = require('path');
var Promise = require('bluebird');
var fs = require('fs');
var mkdirp = require('mkdirp');
var format = require('util').format;
var rimrafAsync = Promise.promisify(require('rimraf'));
var formstream = require('formstream');

var fixtures = {};

fixtures.apiKey = 'currentApiKey' + Date.now();
fixtures.newApiKey = 'newApiKey' + Date.now();

var app = require('../');

app.server.app.baseDir = 'test/data';
app.server.app.apiKeyStorage = 'test/api_key';
app.server.app.apiKey = fixtures.apiKey;

var internals = {};

internals.promisifyStream = function(stream) {

  return new Promise(function(resolve, reject) {

    var buffers = [];

    stream.on('data', function(data) {
      buffers.push(data);
    });

    stream.on('end', function() {
      resolve(Buffer.concat(buffers));
    });

    stream.on('error', reject);
  });

};

app.server.register(require('inject-then'), function(err) {
  if (err) throw err;
});

describe('Imagane', function () {

  before(function(done) {

    fs.statAsync(app.server.app.baseDir)
      .then(function(stat) {
        return rimrafAsync(app.server.app.baseDir);
      })
      .catch(function() {
        // Catch not exists data dir
      })
      .then(function() {
        return mkdirp.mkdirpAsync(app.server.app.baseDir);
      })
      .finally(done);
  });

  it('update api token', function(done) {
    
    var options = {
      method: 'GET',
      url: format('/apiKey/update/%s?apiKey=%s', fixtures.newApiKey, fixtures.apiKey)
    };

    app.server.injectThen(options)
      .then(function(res) {

        var result = res.result;

        expect(res.statusCode).to.be.equal(200);
        expect(result.apiKey).to.be.equal(fixtures.newApiKey);
        expect(fixtures.newApiKey).to.be.equal(fs.readFileSync(app.server.app.apiKeyStorage, 'utf8'));

        fixtures.apiKey = fixtures.newApiKey;

        return app.server.injectThen(options);
      })
      .then(function(res) {

        expect(res.statusCode).to.be.equal(403);

        done();
      })
      .catch(done);
  });

  it('upload files', function(done) {

    var form = formstream();

    form.file('images[]', 'test/files/img1.jpg');
    form.file('images[]', 'test/files/img2.jpg');
    form.file('attach/ments', 'test/files/img2.jpg');

    var options = {
      method: 'POST',
      headers: form.headers(),
      url: '/upload?apiKey=' + fixtures.apiKey
    };

    return internals.promisifyStream(form)
      .then(function(payload) {

        options.payload = payload;
            
        return app.server.injectThen(options);
      })
      .then(function(res) {

        var result = res.result;

        expect(res.statusCode).to.be.equal(200);

        expect(result.files).to.be.an.array();
        expect(result.files).to.have.length(3);

        expect(result.files[0].path).to.be.equal('images/img1.jpg');
        expect(result.files[1].path).to.be.equal('images/img2.jpg');
        expect(result.files[2].path).to.be.equal('attach/ments/img2.jpg');

        expect(result.base).to.be.not.empty();
        expect(result.download).to.be.not.empty();

        fixtures.uploads = result;

        return result.files
          .map(function(file) {
            return fs.statAsync(Path.join(app.server.app.baseDir, file.path));
          });
      })
      .then(function(res) {
        done();
      })
      .catch(done);
  });

  it('download files', function(done) {

    var options = {
      method: 'GET'
    };

    var promises = fixtures.uploads.files
      .map(function(file) {

        options.url = Path.join(fixtures.uploads.download, file.path);

        return app.server.injectThen(options)
          .then(function(res) {

            expect(res.statusCode).to.be.equal(200);
            expect(res.headers).to.contain('content-length');
          });
      });

    Promise.all(promises)
      .then(function() {
        done();
      })
      .catch(done);
  });

  it('get filelist', function(done) {

    var options = {
      method: 'GET',
      url: format('/list%s?apiKey=%s', '', fixtures.apiKey)
    };

    app.server.injectThen(options)
      .then(function(res) {

        var result = res.result;

        expect(res.statusCode).to.be.equal(200);

        expect(result.collections).to.be.an.array();
        expect(result.files).to.be.an.array();
        expect(result.collections).to.contain(['attach', 'images']);
        expect(result.files).to.be.empty();

        var promises = result.collections
          .map(function(collection) {

            options.url = format('/list/%s?apiKey=%s', collection, fixtures.apiKey);

            return app.server.injectThen(options);
          });

        return Promise.all(promises);
      })
      .then(function(all) {

        var files = [];
        var collections = [];

        all
          .forEach(function(res) {

            var result = res.result;

            expect(res.statusCode).to.be.equal(200);

            expect(result.collections).to.be.an.array();
            expect(result.files).to.be.an.array();

            files = files.concat(result.files);
            collections = collections.concat(result.collections);

          });

        var promises = {};

        promises.files = files
          .map(function(file) {

            options.url = format('/download/%s', file);

            return app.server.injectThen(options)
              .then(function(res) {
                expect(res.statusCode).to.be.equal(200);
              });
          });

        promises.collections = collections
          .map(function(collection) {

            options.url = format('/list/%s?apiKey=%s', collection, fixtures.apiKey);

            return app.server.injectThen(options);
          });

        return [ Promise.all(promises.files), Promise.all(promises.collections) ];
      })
      .spread(function(files, collections) {

        var promises = collections
          .map(function(res) {

            var result = res.result;

            expect(res.statusCode).to.be.equal(200);

            expect(result.files).to.be.an.array();
            expect(result.collections).to.be.an.array();

            expect(result.files).to.be.not.empty();
            expect(result.collections).to.be.empty();

            return result.files
              .map(function(file) {

                options.url = format('/download/%s', file);

                return app.server.injectThen(options)
                  .then(function(res) {
                    expect(res.statusCode).to.be.equal(200);
                  });
              });
          });

          return promises;
      })
      .then(function() {
        done();
      })
      .catch(done);
  });

  it('get responsive image', function(done) {

    expect(fixtures.uploads.files).to.be.an.array();

    var transforms = [
      '200x100',
      'h300w100',
      'h500w400q85pc2emaxweiariwb256-256-256-0r180.jpeg'
    ];
    
    var options = {
      method: 'GET'
    };

    var promises = fixtures.uploads.files
      .map(function(file, index) {

        var transform = transforms[index];

        options.url = format('/responsive/%s/%s?apiKey=%s', transform, file.path, fixtures.apiKey);

        return app.server.injectThen(options)
          .then(function(res) {
            expect(res.statusCode).to.be.equal(200);
          });
      });

    Promise.all(promises)
      .then(function() {
        done();
      })
      .catch(done);
  });

});
