var Joi = require('joi');
var Boom = require('boom');
var Promise = require('bluebird');
var fs = require('fs');
var Path = require('path');

var upload = require('./upload');
var sharpen = require('./sharpen');

var internals = {};

internals.index = {
  auth: 'apiKey',
  handler: function(request, reply) {
    reply({ api: 'ok' });
  }
};

internals.updateApiKey = {
  auth: 'apiKey',
  validate: {
    params: Joi.object({
      apiKey: Joi.string()
    })
  },
  handler: function(request, reply) {

    var apiKey = request.params.apiKey;

    fs.writeFile(request.server.app.apiKeyStorage, apiKey, 'utf8', function(err) {

      request.server.app.apiKey = apiKey;

      reply(err, { done: 1, apiKey: apiKey });
    });

  }
};

internals.upload = {
  auth: 'apiKey',
  payload: {
    output: 'file',
    maxBytes: 1024 * 1024 * 1024
  },
  handler: function(request, reply) {

    upload.uploadFilePayload(request.server.app.baseDir, request.payload)
      .then(function(files) {

        reply({
          files: files,
          base: request.server.info.uri,
          download: '/download'
        });
      })
      .catch(function(err) {
        reply(err, null);
      });
  }
};

internals.list = {
  auth: 'apiKey',
  validate: {
    query: {
      type: Joi.string().valid('dir', 'file')
    }
  },
  handler: function(request, reply) {

    var p = request.params.p || '';
    var cacheDir = request.server.app.cacheDir;
    var path = Path.join(request.server.app.baseDir, p);

    fs.readdirAsync(path)
      .then(function(data) {

        var promises = [];
        var names = [];

        data.forEach(function(file) {

          if (file.charAt(0) === '.' || file === cacheDir) {
            return;
          }

          names.push(file);
          promises.push(fs.statAsync(Path.join(path, file)));
        });

        return [Promise.all(promises), names];
      })
      .spread(function(all, names) {

        var collections = [], files = [];

        all.forEach(function(stat, index) {

          if (stat.isDirectory()) {
            collections.push(Path.join(p, names[index]));
          } else {
            files.push(Path.join(p, names[index]));
          }

        });

        reply({ collections: collections, files: files });
      })
      .catch(function() {
        reply({ dirs: [], files: [] });
      });

  }
};

internals.download = {
  handler: function(request, reply) {

    var path = Path.join(request.server.app.baseDir, request.params.p);

    fs.statAsync(path)
      .then(function(exists) {

        reply(fs.createReadStream(path))
          .bytes(exists.size);
      })
      .catch(function() {
        reply(Boom.notFound());
      });
  }
};

internals.responsive = {
  handler: function(request, reply) {

    var baseDir = request.server.app.baseDir;
    var cacheDir = request.server.app.cacheDir;

    var path = Path.join(baseDir, request.params.p);
    var dirname = Path.dirname(request.params.p);
    var basename = Path.basename(request.params.p);
    var cache = Path.join(baseDir, dirname, cacheDir, request.params.params + '_' + basename);

    var originalExists = fs.statAsync(path)
      .catch(function() {
        return null;
      });

    var cacheExists = fs.statAsync(cache)
      .catch(function() {
        return null;
      });

    Promise.all([ originalExists, cacheExists ])
      .spread(function(originalExists, cacheExists) {
        
        if (cacheExists) {
          return reply(fs.createReadStream(cache))
            .bytes(cacheExists.size);
        }

        if (!originalExists) {
          throw Boom.notFound();
        }

        var file = fs.createReadStream(path);

        var transform = sharpen.getTransform(request.params.params);

        upload.storeStream(cache, transform.clone());

        reply(file.pipe(transform));
      })
      .catch(function(err) {
        reply(err);
      });
  }
};

module.exports = [
  { method: 'GET',    path: '/', config: internals.index },
  { method: 'GET',    path: '/apiKey/update/{apiKey}', config: internals.updateApiKey },
  { method: 'POST',   path: '/upload', config: internals.upload },
  { method: 'GET',    path: '/list', config: internals.list },
  { method: 'GET',    path: '/list/{p*}', config: internals.list },
  { method: 'GET',    path: '/download/{p*}', config: internals.download },
  { method: 'GET',    path: '/responsive/{params}/{p*}', config: internals.responsive }
];
