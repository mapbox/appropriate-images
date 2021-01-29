'use strict';

const meow = require('meow');
const path = require('path');
const chalk = require('chalk');
const _ = require('lodash');
const generate = require('../lib/generate');
const errors = require('../lib/errors');

const rel = (x) => path.relative(process.cwd(), x);
const abs = (x) => {
  if (path.isAbsolute(x)) return x;
  return path.resolve(process.cwd(), x);
};

// Documented in README.
module.exports = (imageConfig, options) => {
  if (
    !imageConfig ||
    !options ||
    !options.inputDirectory ||
    !options.outputDirectory
  ) {
    throw new Error(
      'You must provide an image config and the inputDirectory and outputDirectory options'
    );
  }

  const description =
    'Generate resized and optimized variants from a directory of images.';
  const help = `
  Reads images from ${rel(options.inputDirectory)}.
  Writes resized, optimized images to ${rel(options.outputDirectory)}.

  ${chalk.bold.underline('Usage')}
    appropriate-images [<id> ...] [options]

    ids are keys from the config identifying images to be processed.

  ${chalk.bold.underline('Examples')}
    appropriate-images horse
    appropriate-images --all
    appropriate-images horse pigMan walrus --quiet
    appropriate-images --all -c 5

  ${chalk.bold.underline('Options')}
    -a, --all      Just process all the images, don't look back.
    -q, --quiet    Do not log output filenames.
    -c, --maxConcurrency Optimize images with limited maxConcurrency,
  `;

  const cli = meow(
    { description, help },
    {
      alias: {
        a: 'all',
        q: 'quiet',
        c: 'maxConcurrency'
      }
    }
  );

  const ids = cli.input;

  if (ids.length === 0 && !cli.flags.all) {
    console.log(
      `${chalk.red.bold(
        'Usage error:'
      )} You must specify image ids or use --all`
    );
    cli.showHelp();
  }

  const generateOptions = Object.assign({}, options, {
    inputDirectory: abs(options.inputDirectory),
    outputDirectory: abs(options.outputDirectory)
  });

  if (ids.length !== 0) {
    generateOptions.ids = ids;
  }

  if (cli.flags.c) {
    generateOptions.maxConcurrency = cli.flags.c;
  }

  const logUsageError = (error) => {
    console.log(`${chalk.red.bold('Usage error:')} ${error.message}`);
  };

  generate(imageConfig, generateOptions)
    .then((filenames) => {
      if (cli.flags.quiet) return;
      const printableFilenames = _.flatten(filenames)
        .sort()
        .map(
          (filename) =>
            chalk.grey('Saved ') +
            path.relative(options.outputDirectory, filename)
        );
      console.log(printableFilenames.join('\n'));
      console.log(
        chalk.bold(`Generated ${printableFilenames.length} optimized images`)
      );
    })
    .catch((error) => {
      if (
        Array.isArray(error) &&
        error.every((e) => e instanceof errors.UsageError)
      ) {
        return error.forEach(logUsageError);
      }
      if (error instanceof errors.UsageError) {
        return logUsageError(error);
      }
      throw error;
    });
};
