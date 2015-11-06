var Sharp = require('sharp');

var sharpen = {};

var cropList = {
  1: 'north',
  2: 'east',
  3: 'south',
  4: 'west',
  5: 'center',
  6: 'centre'
};

sharpen.toObject = function(params) {

  var matches = {
    size: params.match(/(\d+)x(\d+)/i),
    height: params.match(/h(\d+)/i),
    width: params.match(/w(\d+)/i),
    crop: params.match(/c(\d+)/i),
    fill: params.match(/min|max/i),
    rotate: params.match(/r(\d+)/i),
    extract: params.match(/e(\d+)-(\d+)-(\d+)-(\d+)/i),
    quality: params.match(/q(\d+)/i),
    format: params.match(/\.(jpeg|png|webp|raw)/i)
  };

  var actions = {};

  if (matches.size) {
    actions.resize = [ +matches.size[1], +matches.size[2] ];
  }

  if (matches.width) {
    actions.resize = actions.resize || [];
    actions.resize[0] = +matches.width[1];
  }

  if (matches.height) {
    actions.resize = actions.resize || [];
    actions.resize[1] = +matches.height[1];
  }

  if (matches.crop) {
    var gravity = cropList[matches.crop[1]];
    actions.crop = [ Sharp.gravity[gravity] ];
  }

  if (matches.fill) {
    if (matches.fill[0] === 'max') {
      actions.max = [];
    } else if (matches.fill[0] === 'min') {
      actions.min = [];
    }
  }

  if (matches.rotate) {
    actions.rotate = [ +matches.rotate[1] ];
  }

  if (matches.extract) {
    actions.extract = [ +matches.extract[1], +matches.extract[2], +matches.extract[3],  +matches.extract[4] ];
  }

  if (matches.quality) {
    actions.quality = [ +matches.quality[1] ];
  }

  if (matches.format) {
    actions[ matches.format[1] ] = [];
  }

  return actions;
};

sharpen.getTransform = function(params) {

  var sharp = Sharp();
  
  var options = this.toObject(params);

  var key;

  for(key in options) {
    sharp[key].apply(sharp, options[key]);
  }

  return sharp;
};

module.exports = sharpen;
