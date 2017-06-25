'use strict';

var getWindow = require('./get-window');

var resolutionCache = {};
function isHighResolution(ratio) {
  var win = getWindow();
  if (win === undefined || win.matchMedia === undefined) return false;
  if (resolutionCache[ratio] !== undefined) return resolutionCache[ratio];
  var result = win.matchMedia(
    'only screen and (-webkit-min-device-pixel-ratio: ' +
      ratio +
      '), ' +
      'only screen and (min-resolution: ' +
      (ratio * 96).toFixed(3) +
      'dpi)'
  ).matches;
  resolutionCache[ratio] = result;
  return result;
}

// For tests
isHighResolution.clearCache = function() {
  resolutionCache = {};
};

module.exports = isHighResolution;
