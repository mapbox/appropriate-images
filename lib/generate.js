'use strict';

const _ = require('lodash');
const sharp = require('sharp');
const UsageError = require('./errors').UsageError;
const tempy = require('tempy');
const pify = require('pify');
const mkdirp = require('mkdirp');
const del = require('del');
const fs = require('fs');
const pFinally = require('p-finally');
const path = require('path');
const pLimit = require('p-limit');
const optimize = require('./optimize');

// Suppress vips warnings from sharp
process.env.VIPS_WARNING = true;

/**
 * Put width and height together into a dimension-representing suffix.
 *
 * @param {number} [width]
 * @param {number} [height]
 * @return {string}
 */
function createSizeSuffix(width, height) {
  let result = String(width);
  if (height !== undefined) result += `x${String(height)}`;
  return result;
}

/**
 * Generate all the size variants of an image.
 *
 * @param {Object} entry - Entry in the image config.
 * @param {string} inputDirectory
 * @param {string} outputDirectory
 * @return {Promise<Array<string>>} - Resolves with an array of the output filenames.
 */
function generateSizes(entry, inputDirectory, outputDirectory) {
  const imageFileName = path.join(inputDirectory, entry.basename);
  return pify(fs.readFile)(imageFileName).then((imageBuffer) => {
    const sharpFile = sharp(imageBuffer);
    return Promise.all(
      entry.sizes.map((size) => {
        const sizeSuffix = createSizeSuffix(size.width, size.height);
        const ext = path.extname(entry.basename);
        const extlessBasename = path.basename(entry.basename, ext);
        const outputFilename = path.join(
          outputDirectory,
          `${extlessBasename}-${sizeSuffix}${ext}`
        );

        if (size.crop) {
          throw new UsageError(
            `"crop" is deprecated, use options: https://github.com/mapbox/appropriate-images#options`
          );
        }

        const transform =
          size.options && size.height
            ? sharpFile.resize(size.width, size.height, size.options)
            : sharpFile.resize(size.width, size.height);

        return transform.toFile(outputFilename).then(() => outputFilename);
      })
    );
  });
}

/**
 * Delete all prior generated versions of an image source file.
 *
 * @param {string} directory
 * @param {string} sourceImageBasename
 * @return {Promise<void>} - Resolves when the versions are deleted.
 */
function clearPriorOutput(directory, sourceImageBasename) {
  const ext = path.extname(sourceImageBasename);
  const extlessBasename = path.basename(sourceImageBasename, ext);
  return del(path.join(directory, `${extlessBasename}*.*`));
}

/**
 * Handle optimizing file(s)
 *
 * @param {string} options
 * @param {array} results
 * @return {array} - Resolves with an array of optimized filenames.
 */
function handleOptimize(options, results) {
  if (options.maxConcurrency) {
    const limit = pLimit(options.maxConcurrency);
    const optimizeQueue = [];
    for (const res in results) {
      optimizeQueue.push(
        limit(() => optimize(_.flatten(results[res]), options))
      );
    }
    return Promise.all(optimizeQueue);
  } else {
    return optimize(_.flatten(results), options);
  }
}

// Documented in README.
module.exports = (imageConfig, options) => {
  let usageErrors = [];
  if (imageConfig === undefined) {
    return Promise.reject(new UsageError('config is required'));
  }
  if (options.inputDirectory === undefined) {
    usageErrors.push(new UsageError('options.inputDirectory is required'));
  }
  if (options.outputDirectory === undefined) {
    usageErrors.push(new UsageError('options.outputDirectory is required'));
  }

  if (options.ids !== undefined) {
    options.ids.forEach((id) => {
      if (imageConfig[id] !== undefined) return;
      usageErrors.push(new UsageError(`"${id}" is not a valid image id`));
    });
  }

  if (usageErrors.length !== 0) {
    return Promise.reject(usageErrors);
  }

  const tailoredImageConfig =
    options.ids !== undefined ? _.pick(imageConfig, options.ids) : imageConfig;
  const imageIdsForProcessing = Object.keys(tailoredImageConfig);

  const temporaryDirectory = tempy.directory();
  const createTemporaryDirectory = () => mkdirp(temporaryDirectory);
  const destroyTemporaryDirectory = () =>
    del(temporaryDirectory, { force: true });

  return Promise.resolve().then(() => {
    const configErrors = [];
    const generateSizeVariants = imageIdsForProcessing.reduce(
      (sizePromises, id) => {
        const entry = imageConfig[id];
        if (entry.basename === undefined) {
          configErrors.push(new UsageError(`basename missing for "${id}"`));
        }
        if (entry.sizes === undefined) {
          configErrors.push(new UsageError(`sizes missing for "${id}"`));
        }
        if (configErrors.length !== 0) return sizePromises;

        const sizes = generateSizes(
          entry,
          options.inputDirectory,
          temporaryDirectory
        ).catch((error) => {
          if (error.code === 'ENOENT') {
            configErrors.push(new UsageError(`invalid basename for "${id}"`));
          } else {
            throw error;
          }
        });

        sizePromises.push(
          Promise.all([
            clearPriorOutput(options.outputDirectory, entry.basename),
            sizes
          ]).then((data) => data[1])
        );
        return sizePromises;
      },
      []
    );
    if (configErrors.length) return Promise.reject(configErrors);

    const makeItHappen = createTemporaryDirectory()
      .then(() => Promise.all(generateSizeVariants))
      .then((result) => {
        if (configErrors.length) return Promise.reject(configErrors);
        return result;
      })
      .then((result) => handleOptimize(options, result));

    return pFinally(makeItHappen, destroyTemporaryDirectory);
  });
};
