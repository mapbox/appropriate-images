// #!/usr/bin/env node
// 'use strict';
//
// const meow = require('meow');
// const path = require('path');
// const chalk = require('chalk');
// const generate = require('../lib/generate').generate;
// const UsageError = require('../lib/generate').UsageError;
//
// const description =
//   'Generate resized and optimized variants from a directory of images.';
// const help = `
// Loads the image config from lib/image_config.js.
// Reads files from src/img/raw.
// Writes files to src/img/optimized.
//
// ${chalk.bold.underline('Usage')}
//   appropriate-images [<id> ...] [options]
//
//   ids are keys from the config identifying images to be processed.
//
// ${chalk.bold.underline('Examples')}
//   appropriate-images horse
//   appropriate-images --all
//   appropriate-images horse pigMan walrus --verbose
//
// ${chalk.bold.underline('Options')}
//   --all          Just process all the images, don't look back.
//   -q, --quiet    Do not log output filenames.
// `;
//
// const cli = meow(
//   {
//     description,
//     help
//   },
//   {
//     alias: {
//       q: 'quiet'
//     }
//   }
// );
//
// const ids = cli.input;
//
// if (ids.length === 0 && !cli.flags.all) {
//   cli.showHelp();
// }
//
// const options = {
//   inputDirectory: path.join(__dirname, '../src/img/raw'),
//   outputDirectory: path.join(__dirname, '../src/img/optimized')
// };
// if (ids.length !== 0) {
//   options.ids = ids;
// }
//
// function logUsageError(error) {
//   console.log(`${chalk.red.bold('Usage error:')} ${error.message}`);
// }
//
// generate(config, options)
//   .then(filenames => {
//     if (cli.flags.quiet) return;
//     const printableFilenames = filenames
//       .sort()
//       .map(
//         filename =>
//           chalk.grey('Saved ') +
//           path.relative(path.join(__dirname, '../src/img/optimized'), filename)
//       );
//     console.log(printableFilenames.join('\n'));
//     console.log(
//       chalk.bold(`Generated ${printableFilenames.length} optimized images`)
//     );
//   })
//   .catch(error => {
//     if (Array.isArray(error) && error.every(e => e instanceof UsageError)) {
//       return error.forEach(logUsageError);
//     }
//     if (error instanceof UsageError) {
//       return logUsageError(error);
//     }
//     throw error;
//   });
