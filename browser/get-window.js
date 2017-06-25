'use strict';

// This function exists so it can be mocked in tests.
module.exports = function() {
  if (typeof window === 'undefined') return;
  return window;
};
