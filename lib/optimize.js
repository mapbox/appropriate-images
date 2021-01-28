'use strict';

const _ = require('lodash');
const fs = require('fs').promises;
const imagemin = require('imagemin');
const imageminPngquant = require('imagemin-pngquant');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminWebp = require('imagemin-webp');

/**
 * Given output from imagemin, write image files.
 *
 * @param {Array<{ destinationPath: string, data: Buffer }>} imageData - imagemin output.
 * @return {Promise<Array<string>>} - Resolves with an array of filenames for optimized images that
 *   have been written.
 */
async function writeOptimizedImages(imageData) {
  let destinationPaths = [];
  for (const item of imageData) {
    try {
      await fs.writeFile(item.destinationPath, item.data);
      destinationPaths.push(item.destinationPath);
    } catch (error) {
      throw new Error(error);
    }
  }
  return destinationPaths;
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
module.exports = async (imageFilenames, options) => {
  // These are two separate processes because otherwise the webp plugin
  // overrides the others, somehow.
  let filenameArrays = [];
  try {
    const regularOptimizations = await imagemin(imageFilenames, {
      destination: options.outputDirectory,
      plugins: [
        imageminPngquant(options.pngquant),
        imageminMozjpeg(options.mozjpeg)
      ]
    });
    filenameArrays = [
      ...filenameArrays,
      ...(await writeOptimizedImages(regularOptimizations))
    ];
  } catch (err) {
    throw new Error(err);
  }

  try {
    const webpOptimizations = await imagemin(imageFilenames, {
      destination: options.outputDirectory,
      plugins: [imageminWebp(options.webp)]
    });
    filenameArrays = [
      ...filenameArrays,
      ...(await writeOptimizedImages(webpOptimizations))
    ];
  } catch (err) {
    throw new Error(err);
  }

  return _.flatten(filenameArrays);
};
