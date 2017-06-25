'use strict';

const _ = require('lodash');
const pify = require('pify');
const fs = require('fs');
const imagemin = require('imagemin');
const imageminPngquant = require('imagemin-pngquant');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminWebp = require('imagemin-webp');

/**
 * Given output from imagemin, write image files.
 *
 * @param {Array<{ path: string, data: Buffer }>} imageData - imagemin output.
 * @return {Promise<Array<string>>} - Resolves with an array of filenames for optimized images that
 *   have been written.
 */
function writeOptimizedImages(imageData) {
  return Promise.all(
    imageData.map(item =>
      pify(fs.writeFile)(item.path, item.data).then(() => item.path)
    )
  );
}

/**
 * Create optimized versions of images.
 *
 * @param {Array<string>} imageFilenames
 * @param {Object} options
 * @param {string} options.outputDirectory
 * @param {Object} [options.pngquant]
 * @param {Object} [options.mozjpeg]
 * @param {Object} [options.webp]
 * @return {Promise<Array<string>>} - Resolves with an array of filenames for
 *   optimized images that have been written to the output directory.
 */
module.exports = (imageFilenames, options) => {
  // These are two separate processes because otherwise the webp plugin
  // overrides the others, somehow.
  const regularOptimizations = imagemin(
    imageFilenames,
    options.outputDirectory,
    {
      plugins: [
        imageminPngquant(options.pngquant),
        imageminMozjpeg(options.mozjpeg)
      ]
    }
  ).then(writeOptimizedImages);

  const webpOptimizations = imagemin(imageFilenames, options.outputDirectory, {
    plugins: [imageminWebp(options.webp)]
  }).then(writeOptimizedImages);

  return Promise.all([
    regularOptimizations,
    webpOptimizations
  ]).then(filenameArrays => _.flatten(filenameArrays));
};
