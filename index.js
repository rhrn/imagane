var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var Hapi = require('hapi');

var server = new Hapi.Server({
  connections: {
    router: { stripTrailingSlash: true }
  }
});

server.app.apiKeyStorage = 'api_key';
server.app.baseDir = 'data';
server.app.cacheDir = '__cache';
server.app.apiKey = fs.readFileSync(server.app.apiKeyStorage, 'utf8');

server.connection({ port: process.env.NODE_PORT || 3000 });

server.auth.scheme('apiKey', require('./lib/auth'));
server.auth.strategy('apiKey', 'apiKey');

server.route(require('./lib/routes'));

server.start(function () {
  console.log('Server running at:', server.info.uri);
  console.log('API Key:', server.app.apiKey);
});

module.exports.server = server;
