var Boom = require('boom');

var scheme = function (server, options) {

  return {
    authenticate: function (request, reply) {

      if (request.query.apiKey !== request.server.app.apiKey) {
        return reply(Boom.forbidden());
      }

      delete request.query.apiKey;

      return reply.continue({credentials: {}});
    }
  };
};

module.exports = scheme;
