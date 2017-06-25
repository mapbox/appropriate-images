'use strict';

var getWindow = require('./get-window');

// Technique https://github.com/bfred-it/supports-webp
var supportsWebpCache;
module.exports = function supportsWebp() {
  var win = getWindow();
  if (!win) return false;
  if (supportsWebpCache !== undefined) return supportsWebpCache;
  var canvas = win.document.createElement('canvas');
  canvas.width = canvas.height = 1;
  if (!canvas.toDataURL) return false;
  supportsWebpCache =
    canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
  return supportsWebpCache;
};
