'use strict';

var isHighResolution = require('./is-high-resolution');
var supportsWebp = require('./supports-webp');

function getAppropriateImageUrl(options) {
  options = options || {};
  if (options.imageId === undefined) throw new Error('imageId is required');
  if (options.imageConfig === undefined)
    throw new Error('imageConfig is required');

  var width = options.width === undefined ? Infinity : options.width;
  var hiResRatio = options.hiResRatio || 1.3;
  var config = options.imageConfig[options.imageId];
  if (config === undefined) {
    throw new Error(options.imageId + ' is not a valid image id');
  }

  // Sort sizes by width, in case the config does not already do this
  var sizes = config.sizes.sort(function(a, b) {
    return a.width - b.width;
  });

  var resAdjustedAvailableWidth = isHighResolution(hiResRatio)
    ? width * hiResRatio
    : width;

  // Use the last size as a fallback;
  var selectedSize = sizes[sizes.length - 1];
  var i = 0;
  var l = sizes.length;
  for (i; i < l; i++) {
    if (resAdjustedAvailableWidth <= sizes[i].width) {
      selectedSize = sizes[i];
      break;
    }
  }

  var heightString =
    selectedSize.height === undefined ? '' : 'x' + String(selectedSize.height);
  var sizeSuffix = String(selectedSize.width) + heightString;
  var splitBasename = config.basename.split('.');
  var extension = supportsWebp() ? 'webp' : splitBasename[1];
  var basename = splitBasename[0] + '-' + sizeSuffix + '.' + extension;

  var url = options.imageDirectory || '';
  if (options.imageDirectory && !/\/$/.test(url)) {
    url += '/';
  }
  url += basename;
  return url;
}

module.exports = getAppropriateImageUrl;
