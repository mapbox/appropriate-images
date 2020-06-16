'use strict';

const del = require('del');
const path = require('path');
const tempy = require('tempy');
const fs = require('fs');
const errors = require('../lib/errors');
const generate = require('../lib/generate');
const optimize = require('../lib/optimize');
const sharp = require('sharp');

jest.mock('../lib/optimize', () => {
  return jest.fn(() => Promise.resolve(['one', 'two', 'three']));
});

jest.mock('sharp', () => {
  const resizers = new Map();
  const croppers = new Map();
  const writers = new Map();
  const m = jest.fn((img) => {
    const s = {};
    s.resize = jest.fn(() => s);
    s.crop = jest.fn(() => s);
    s.toFile = jest.fn(() => Promise.resolve('sharpened'));
    resizers.set(img, s.resize);
    croppers.set(img, s.crop);
    writers.set(img, s.toFile);
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
    return generate({}, options).then((results) => {
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
        .map((n) => path.basename(n))
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
      const bearExpectedBuffer = fs.readFileSync(bear);
      const bearCall = sharp.mock.calls.find((x) =>
        x[0].equals(bearExpectedBuffer)
      );
      expect(bearCall).toBeTruthy();
      const bearBuffer = bearCall[0];
      expect(sharp.resizers.get(bearBuffer)).toHaveBeenCalledTimes(2);
      expect(sharp.resizers.get(bearBuffer)).toHaveBeenCalledWith(
        300,
        undefined
      );
      expect(sharp.resizers.get(bearBuffer)).toHaveBeenCalledWith(
        600,
        undefined
      );
      expect(sharp.croppers.get(bearBuffer)).toHaveBeenCalledTimes(0);
      expect(sharp.writers.get(bearBuffer)).toHaveBeenCalledTimes(2);
      expect(sharp.writers.get(bearBuffer)).toHaveBeenCalledWith(
        expect.stringMatching(/bear-300\.png$/)
      );
      expect(sharp.writers.get(bearBuffer)).toHaveBeenCalledWith(
        expect.stringMatching(/bear-600\.png$/)
      );

      const montaraz = path.join(inputDirectory, 'montaraz.jpg');
      const montarazExpectedBuffer = fs.readFileSync(montaraz);
      const montarazCall = sharp.mock.calls.find((x) =>
        x[0].equals(montarazExpectedBuffer)
      );
      expect(montarazCall).toBeTruthy();
      const montarazBuffer = montarazCall[0];
      expect(sharp.resizers.get(montarazBuffer)).toHaveBeenCalledTimes(4);
      expect(sharp.resizers.get(montarazBuffer)).toHaveBeenCalledWith(300, 500);
      expect(sharp.resizers.get(montarazBuffer)).toHaveBeenCalledWith(
        1200,
        undefined
      );
      expect(sharp.resizers.get(montarazBuffer)).toHaveBeenCalledWith(200, 200);
      expect(sharp.resizers.get(montarazBuffer)).toHaveBeenCalledWith(210, 210);
      expect(sharp.croppers.get(montarazBuffer)).toHaveBeenCalledTimes(3);
      expect(sharp.croppers.get(montarazBuffer)).toHaveBeenCalledWith(
        sharp.gravity.north
      );
      expect(sharp.croppers.get(montarazBuffer)).toHaveBeenCalledWith(
        sharp.gravity.southeast
      );
      expect(sharp.croppers.get(montarazBuffer)).toHaveBeenCalledWith(
        sharp.strategy.entropy
      );
      expect(sharp.writers.get(montarazBuffer)).toHaveBeenCalledTimes(4);
      expect(sharp.writers.get(montarazBuffer)).toHaveBeenCalledWith(
        expect.stringMatching(/montaraz-300x500\.jpg$/)
      );
      expect(sharp.writers.get(montarazBuffer)).toHaveBeenCalledWith(
        expect.stringMatching(/montaraz-1200\.jpg$/)
      );
      expect(sharp.writers.get(montarazBuffer)).toHaveBeenCalledWith(
        expect.stringMatching(/montaraz-200x200\.jpg$/)
      );
      expect(sharp.writers.get(montarazBuffer)).toHaveBeenCalledWith(
        expect.stringMatching(/montaraz-210x210\.jpg$/)
      );

      const osprey = path.join(inputDirectory, 'osprey.jpg');
      const ospreyExpectedBuffer = fs.readFileSync(osprey);
      const ospreyCall = sharp.mock.calls.find((x) =>
        x[0].equals(ospreyExpectedBuffer)
      );
      expect(ospreyCall).toBeTruthy();
      const ospreyBuffer = ospreyCall[0];
      expect(sharp.resizers.get(ospreyBuffer)).toHaveBeenCalledTimes(2);
      expect(sharp.resizers.get(ospreyBuffer)).toHaveBeenCalledWith(
        600,
        undefined
      );
      expect(sharp.resizers.get(ospreyBuffer)).toHaveBeenCalledWith(300, 300);
      expect(sharp.croppers.get(ospreyBuffer)).toHaveBeenCalledTimes(0);
      expect(sharp.writers.get(ospreyBuffer)).toHaveBeenCalledTimes(2);
      expect(sharp.writers.get(ospreyBuffer)).toHaveBeenCalledWith(
        expect.stringMatching(/osprey-600\.jpg$/)
      );
      expect(sharp.writers.get(ospreyBuffer)).toHaveBeenCalledWith(
        expect.stringMatching(/osprey-300x300\.jpg$/)
      );

      const walrus = path.join(inputDirectory, 'walrus.png');
      const walrusExpectedBuffer = fs.readFileSync(walrus);
      const walrusCall = sharp.mock.calls.find((x) =>
        x[0].equals(walrusExpectedBuffer)
      );
      expect(walrusCall).toBeTruthy();
      const walrusBuffer = walrusCall[0];
      expect(sharp.resizers.get(walrusBuffer)).toHaveBeenCalledTimes(1);
      expect(sharp.resizers.get(walrusBuffer)).toHaveBeenCalledWith(
        400,
        undefined
      );
      expect(sharp.croppers.get(walrusBuffer)).toHaveBeenCalledTimes(0);
      expect(sharp.writers.get(walrusBuffer)).toHaveBeenCalledTimes(1);
      expect(sharp.writers.get(walrusBuffer)).toHaveBeenCalledWith(
        expect.stringMatching(/walrus-400\.png$/)
      );
    });
  });

  test('sharp is called as expected with limited ids', () => {
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
    const options = {
      inputDirectory,
      outputDirectory,
      ids: ['osprey', 'walrus']
    };
    return generate(imageConfig, options).then(() => {
      expect(sharp).toHaveBeenCalledTimes(2);

      const bear = path.join(inputDirectory, 'bear.png');
      const bearExpectedBuffer = fs.readFileSync(bear);
      const bearCall = sharp.mock.calls.find((x) =>
        x[0].equals(bearExpectedBuffer)
      );
      expect(bearCall).toBeFalsy();

      const montaraz = path.join(inputDirectory, 'montaraz.jpg');
      const montarazExpectedBuffer = fs.readFileSync(montaraz);
      const montarazCall = sharp.mock.calls.find((x) =>
        x[0].equals(montarazExpectedBuffer)
      );
      expect(montarazCall).toBeFalsy();

      const osprey = path.join(inputDirectory, 'osprey.jpg');
      const ospreyExpectedBuffer = fs.readFileSync(osprey);
      const ospreyCall = sharp.mock.calls.find((x) =>
        x[0].equals(ospreyExpectedBuffer)
      );
      expect(ospreyCall).toBeTruthy();
      expect(sharp.resizers.get(ospreyCall[0])).toHaveBeenCalledTimes(2);

      const walrus = path.join(inputDirectory, 'walrus.png');
      const walrusExpectedBuffer = fs.readFileSync(walrus);
      const walrusCall = sharp.mock.calls.find((x) =>
        x[0].equals(walrusExpectedBuffer)
      );
      expect(walrusCall).toBeTruthy();
      expect(sharp.resizers.get(walrusCall[0])).toHaveBeenCalledTimes(1);
    });
  });

  test('requires config', () => {
    return generate(undefined, {}).then(
      () => {
        throw new Error('should have errored');
      },
      (error) => {
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
      (result) => {
        result.forEach((error) => {
          expect(error instanceof errors.UsageError).toBe(true);
        });
        expect(
          result.some((error) => error.message.includes('inputDirectory'))
        );
        expect(
          result.some((error) => error.message.includes('outputDirectory'))
        );
        expect(result.some((error) => error.message.includes('"foo"')));
        expect(result.some((error) => error.message.includes('"bar"')));
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
      (result) => {
        result.forEach((error) => {
          expect(error instanceof errors.UsageError).toBe(true);
        });
        expect(
          result.some((error) =>
            error.message.includes('basename missing for "osprey"')
          )
        );
        expect(
          result.some((error) =>
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
      (error) => {
        expect(error instanceof errors.UsageError).toBe(true);
        expect(error.message).toMatch('"foo" is not a valid crop value');
      }
    );
  });
});
