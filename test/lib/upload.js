var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();

var path = require('path');

var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var expect = Code.expect;

var upload = require('../../lib/upload');

var baseDir = 'data';

describe('Upload', function () {

    it('prepare files from payload', function (done) {

      var payload = {
        attachments: [
          { filename: 'a.jpg', path: '/var/tmp/a.jpg' },
          { filename: 'b.jpg', path: '/var/tmp/b.jpg' }
        ],
        'collection/image': { filename: 'c.jpg', path: '/var/tmp/c.jpg' }
      };

      var files = upload.preparePayload(baseDir, payload);

      expect(files[0].src, payload.attachments[0].path);
      expect(files[0].filename, payload.attachments[0].filename);
      expect(files[0].dir, path.join(baseDir, 'attachments'));
      expect(files[0].collection, 'attachments');

      expect(files[1].src, payload.attachments[1].path);
      expect(files[1].filename, payload.attachments[1].filename);
      expect(files[1].dir, path.join(baseDir, 'attachments'));
      expect(files[1].collection, 'attachments');

      expect(files[2].src, payload.attachments[1].path);
      expect(files[2].filename, payload.attachments[1].filename);
      expect(files[2].dir, path.join(baseDir, 'collection/image'));
      expect(files[2].collection, 'collection/image');

      done();
    });

});
