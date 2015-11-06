var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();

var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var expect = Code.expect;

var sharpen = require('../../lib/sharpen');

describe('Upload', function () {

  it('params to transform params min', function (done) {

    var params = sharpen.toObject('200x300min');

    expect(params.resize[0]).to.be.equal(200);
    expect(params.resize[1]).to.be.equal(300);
    expect(params.min).to.be.an.array();

    done();
  });

  it('params to transform with height', function (done) {

    var params = sharpen.toObject('h200');

    expect(params.resize[0]).to.be.undefined();
    expect(params.resize[1]).to.be.equal(200);

    done();
  });

  it('params to transform full params', function (done) {

    var params = sharpen.toObject('h500w400q85pc2emaxweiariwe100-200-300-400b256-256-256-0r180.jpeg');

    expect(params.resize[0]).to.be.equal(400);
    expect(params.resize[1]).to.be.equal(500);
    expect(params.max).to.be.an.array();
    expect(params.rotate[0]).to.be.equal(180);
    expect(params.extract[0]).to.be.equal(100);
    expect(params.extract[1]).to.be.equal(200);
    expect(params.extract[2]).to.be.equal(300);
    expect(params.extract[3]).to.be.equal(400);
    expect(params.quality[0]).to.be.equal(85);
    expect(params.jpeg).to.be.an.array();

    done();
  });

});
