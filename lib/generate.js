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
 * Get a cropper constant from sharp.
 *
 * @param {string} name
 * @return {string}
 */
function getCropper(name) {
  // See http://sharp.dimens.io/en/stable/api-resize/#crop
  //
  // Possible attributes of sharp.gravity are north, northeast, east, southeast, south,
  // southwest, west, northwest, center and centre.
  if (sharp.gravity[name] !== undefined) {
    return sharp.gravity[name];
  }
  // The experimental strategy-based approach resizes so one dimension is at its target
  // length then repeatedly ranks edge regions, discarding the edge with the lowest
  // score based on the selected strategy.
  // - entropy: focus on the region with the highest Shannon entropy.
  // - attention: focus on the region with the highest luminance frequency,
  //   colour saturation and presence of skin tones.
  if (sharp.strategy[name] !== undefined) {
    return sharp.strategy[name];
  }

  throw new UsageError(
    `"${name}" is not a valid crop value. Consult http://sharp.dimens.io/en/stable/api-resize/#crop`
  );
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
        const transform = sharpFile.resize(size.width, size.height);
        if (size.crop !== undefined) {
          transform.crop(getCropper(size.crop));
        }
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
  const createTemporaryDirectory = () => pify(mkdirp)(temporaryDirectory);
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
      .then((result) => optimize(_.flatten(result), options));

    return pFinally(makeItHappen, destroyTemporaryDirectory);
  });
};
