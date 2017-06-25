'use strict';

const del = require('del');
const path = require('path');
const tempy = require('tempy');
const errors = require('../lib/errors');
const generate = require('../lib/generate');
const optimize = require('../lib/optimize');
const sharp = require('sharp');

jest.mock('../lib/optimize', () => {
  return jest.fn(() => Promise.resolve(['one', 'two', 'three']));
});

jest.mock('sharp', () => {
  const resizers = {};
  const croppers = {};
  const writers = {};
  const m = jest.fn(filename => {
    const s = {};
    s.resize = jest.fn(() => s);
    s.crop = jest.fn(() => s);
    s.toFile = jest.fn(() => Promise.resolve('sharpened'));
    resizers[filename] = s.resize;
    croppers[filename] = s.crop;
    writers[filename] = s.toFile;
    return s;
  });
  m.gravity = { north: true, southeast: true, northwest: true };
  m.strategy = { entropy: true };
  m.resizers = resizers;
  m.croppers = croppers;
  m.writers = writers;
  return m;
});

describe('generate only', () => {
  const inputDirectory = path.join(__dirname, './fixtures');
  const outputDirectory = tempy.directory();

  afterEach(() => {
    return del(path.join(outputDirectory, '*.*'), { force: true });
  });

  test('output filenames come from optimize step', () => {
    const options = { inputDirectory, outputDirectory };
    return generate({}, options).then(results => {
      expect(results).toEqual(['one', 'two', 'three']);
    });
  });

  test('optimize is called on resized images, with options', () => {
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
    return generate(imageConfig, options).then(() => {
      expect(optimize).toHaveBeenCalledTimes(1);
      expect(optimize.mock.calls[0][1]).toEqual(options);
      const sortedBasenames = optimize.mock.calls[0][0]
        .map(n => path.basename(n))
        .sort();
      expect(sortedBasenames).toEqual([
        'bear-300.png',
        'bear-600.png',
        'montaraz-1200.jpg',
        'montaraz-200x200.jpg',
        'montaraz-210x210.jpg',
        'montaraz-300x500.jpg',
        'osprey-300x300.jpg',
        'osprey-600.jpg',
        'walrus-400.png'
      ]);
    });
  });

  test('sharp is called as expected', () => {
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
          { width: 210, height: 210, crop: 'entropy' }
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
    return generate(imageConfig, options).then(() => {
      expect(sharp).toHaveBeenCalledTimes(4);

      const bear = path.join(inputDirectory, 'bear.png');
      expect(sharp).toHaveBeenCalledWith(bear);
      expect(sharp.resizers[bear]).toHaveBeenCalledTimes(2);
      expect(sharp.resizers[bear]).toHaveBeenCalledWith(300, undefined);
      expect(sharp.resizers[bear]).toHaveBeenCalledWith(600, undefined);
      expect(sharp.croppers[bear]).toHaveBeenCalledTimes(0);
      expect(sharp.writers[bear]).toHaveBeenCalledTimes(2);
      expect(sharp.writers[bear]).toHaveBeenCalledWith(
        expect.stringMatching(/bear-300\.png$/)
      );
      expect(sharp.writers[bear]).toHaveBeenCalledWith(
        expect.stringMatching(/bear-600\.png$/)
      );

      const montaraz = path.join(inputDirectory, 'montaraz.jpg');
      expect(sharp).toHaveBeenCalledWith(montaraz);
      expect(sharp.resizers[montaraz]).toHaveBeenCalledTimes(4);
      expect(sharp.resizers[montaraz]).toHaveBeenCalledWith(300, 500);
      expect(sharp.resizers[montaraz]).toHaveBeenCalledWith(1200, undefined);
      expect(sharp.resizers[montaraz]).toHaveBeenCalledWith(200, 200);
      expect(sharp.resizers[montaraz]).toHaveBeenCalledWith(210, 210);
      expect(sharp.croppers[montaraz]).toHaveBeenCalledTimes(3);
      expect(sharp.croppers[montaraz]).toHaveBeenCalledWith(
        sharp.gravity.north
      );
      expect(sharp.croppers[montaraz]).toHaveBeenCalledWith(
        sharp.gravity.southeast
      );
      expect(sharp.croppers[montaraz]).toHaveBeenCalledWith(
        sharp.strategy.entropy
      );
      expect(sharp.writers[montaraz]).toHaveBeenCalledTimes(4);
      expect(sharp.writers[montaraz]).toHaveBeenCalledWith(
        expect.stringMatching(/montaraz-300x500\.jpg$/)
      );
      expect(sharp.writers[montaraz]).toHaveBeenCalledWith(
        expect.stringMatching(/montaraz-1200\.jpg$/)
      );
      expect(sharp.writers[montaraz]).toHaveBeenCalledWith(
        expect.stringMatching(/montaraz-200x200\.jpg$/)
      );
      expect(sharp.writers[montaraz]).toHaveBeenCalledWith(
        expect.stringMatching(/montaraz-210x210\.jpg$/)
      );

      const osprey = path.join(inputDirectory, 'osprey.jpg');
      expect(sharp).toHaveBeenCalledWith(osprey);
      expect(sharp.resizers[osprey]).toHaveBeenCalledTimes(2);
      expect(sharp.resizers[osprey]).toHaveBeenCalledWith(600, undefined);
      expect(sharp.resizers[osprey]).toHaveBeenCalledWith(300, 300);
      expect(sharp.croppers[osprey]).toHaveBeenCalledTimes(0);
      expect(sharp.writers[osprey]).toHaveBeenCalledTimes(2);
      expect(sharp.writers[osprey]).toHaveBeenCalledWith(
        expect.stringMatching(/osprey-600\.jpg$/)
      );
      expect(sharp.writers[osprey]).toHaveBeenCalledWith(
        expect.stringMatching(/osprey-300x300\.jpg$/)
      );

      const walrus = path.join(inputDirectory, 'walrus.png');
      expect(sharp).toHaveBeenCalledWith(walrus);
      expect(sharp.resizers[walrus]).toHaveBeenCalledTimes(1);
      expect(sharp.resizers[walrus]).toHaveBeenCalledWith(400, undefined);
      expect(sharp.croppers[walrus]).toHaveBeenCalledTimes(0);
      expect(sharp.writers[walrus]).toHaveBeenCalledTimes(1);
      expect(sharp.writers[walrus]).toHaveBeenCalledWith(
        expect.stringMatching(/walrus-400\.png$/)
      );
    });
  });

  test('requires config', () => {
    return generate(undefined, {}).then(
      () => {
        throw new Error('should have errored');
      },
      error => {
        expect(error instanceof errors.UsageError).toBe(true);
        expect(error.message).toMatch('config is required');
      }
    );
  });

  test('other initial usage errors', () => {
    return generate(
      {},
      {
        ids: ['foo', 'bar']
      }
    ).then(
      () => {
        throw new Error('should have errored');
      },
      result => {
        result.forEach(error => {
          expect(error instanceof errors.UsageError).toBe(true);
        });
        expect(result.some(error => error.message.includes('inputDirectory')));
        expect(result.some(error => error.message.includes('outputDirectory')));
        expect(result.some(error => error.message.includes('"foo"')));
        expect(result.some(error => error.message.includes('"bar"')));
      }
    );
  });

  test('config item usage errors', () => {
    const imageConfig = {
      bear: {
        basename: 'bear.png'
      },
      osprey: {
        sizes: [{ width: 300 }, { width: 600 }]
      }
    };
    const options = { inputDirectory, outputDirectory };
    return generate(imageConfig, options).then(
      () => {
        throw new Error('should have errored');
      },
      result => {
        result.forEach(error => {
          expect(error instanceof errors.UsageError).toBe(true);
        });
        expect(
          result.some(error =>
            error.message.includes('basename missing for "osprey"')
          )
        );
        expect(
          result.some(error =>
            error.message.includes('sizes missing for "bear"')
          )
        );
      }
    );
  });

  test('crop value errors', () => {
    const imageConfig = {
      osprey: {
        basename: 'osprey.jpg',
        sizes: [{ width: 300, crop: 'foo' }, { width: 600 }]
      }
    };
    const options = { inputDirectory, outputDirectory };
    return generate(imageConfig, options).then(
      () => {
        throw new Error('should have errored');
      },
      error => {
        expect(error instanceof errors.UsageError).toBe(true);
        expect(error.message).toMatch('"foo" is not a valid crop value');
      }
    );
  });
});
