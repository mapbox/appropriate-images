'use strict';

const fs = require('fs');
const pify = require('pify');
const del = require('del');
const path = require('path');
const tempy = require('tempy');
const errors = require('../lib/errors');
const generate = require('../lib/generate');

describe('generate', () => {
  const inputDirectory = path.join(__dirname, './fixtures');
  const outputDirectory = tempy.directory();

  afterEach(() => {
    return del(path.join(outputDirectory, '*.*'), { force: true });
  });

  test('works', () => {
    const imageConfig = {
      bear: {
        basename: 'bear.png',
        sizes: [{ width: 300 }, { width: 600 }]
      },
      montaraz: {
        basename: 'montaraz.jpg',
        sizes: [
          { width: 300, height: 500 },
          { width: 1200, crop: 'north' },
          { width: 200, height: 200, crop: 'southeast' },
          { width: 210, height: 210, crop: 'northwest' }
        ]
      },
      osprey: {
        basename: 'osprey.jpg',
        sizes: [{ width: 600 }, { width: 300, height: 300 }]
      },
      walrus: {
        basename: 'walrus.png',
        sizes: [{ width: 400 }]
      }
    };

    const options = { inputDirectory, outputDirectory };

    return generate(imageConfig, options)
      .then(() => pify(fs.readdir)(outputDirectory))
      .then(outputFiles => {
        expect(outputFiles).toEqual([
          'bear-300.png',
          'bear-300.webp',
          'bear-600.png',
          'bear-600.webp',
          'montaraz-1200.jpg',
          'montaraz-1200.webp',
          'montaraz-200x200.jpg',
          'montaraz-200x200.webp',
          'montaraz-210x210.jpg',
          'montaraz-210x210.webp',
          'montaraz-300x500.jpg',
          'montaraz-300x500.webp',
          'osprey-300x300.jpg',
          'osprey-300x300.webp',
          'osprey-600.jpg',
          'osprey-600.webp',
          'walrus-400.png',
          'walrus-400.webp'
        ]);
      });
  });

  test('works with specified ids', () => {
    const imageConfig = {
      bear: {
        basename: 'bear.png',
        sizes: [{ width: 300 }, { width: 600 }]
      },
      montaraz: {
        basename: 'montaraz.jpg',
        sizes: [
          { width: 300, height: 500 },
          { width: 1200, crop: 'north' },
          { width: 200, height: 200, crop: 'southeast' },
          { width: 210, height: 210, crop: 'northwest' }
        ]
      },
      osprey: {
        basename: 'osprey.jpg',
        sizes: [{ width: 600 }, { width: 300, height: 300 }]
      },
      walrus: {
        basename: 'walrus.png',
        sizes: [{ width: 400 }]
      }
    };

    const options = {
      ids: ['bear', 'walrus'],
      inputDirectory,
      outputDirectory
    };

    return generate(imageConfig, options)
      .then(() => pify(fs.readdir)(outputDirectory))
      .then(outputFiles => {
        expect(outputFiles).toEqual([
          'bear-300.png',
          'bear-300.webp',
          'bear-600.png',
          'bear-600.webp',
          'walrus-400.png',
          'walrus-400.webp'
        ]);
      });
  });

  test('config item bad basename', () => {
    const imageConfig = {
      bear: {
        basename: 'bearrrrr.png',
        sizes: [{ width: 300 }, { width: 600 }]
      }
    };
    const options = { inputDirectory, outputDirectory };
    return generate(imageConfig, options).then(
      () => {
        throw new Error('should have errored');
      },
      result => {
        expect(result.length).toBe(1);
        const error = result[0];
        expect(error instanceof errors.UsageError).toBe(true);
        expect(error.message).toMatch('invalid basename for "bear"');
      }
    );
  });
});
