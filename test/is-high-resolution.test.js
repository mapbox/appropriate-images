'use strict';

const isHighResolution = require('../browser/is-high-resolution');
const getWindow = require('../browser/get-window');

jest.mock('../browser/get-window', () => {
  const win = {
    matchMedia: jest.fn().mockReturnValue({ matches: false })
  };
  const m = () => win;
  m.win = win;
  return m;
});

describe('isHighResolution', () => {
  afterEach(() => {
    isHighResolution.clearCache();
  });

  test('basically works', () => {
    expect(isHighResolution(1.3)).toBe(false);
    expect(getWindow.win.matchMedia).toHaveBeenCalledTimes(1);
    expect(getWindow.win.matchMedia).toHaveBeenCalledWith(
      `only screen and (-webkit-min-device-pixel-ratio: 1.3), only screen and (min-resolution: 124.800dpi)`
    );
  });

  test('can return true', () => {
    getWindow.win.matchMedia.mockReturnValueOnce({ matches: true });
    expect(isHighResolution(1.3)).toBe(true);
    expect(getWindow.win.matchMedia).toHaveBeenCalledTimes(1);
    expect(getWindow.win.matchMedia).toHaveBeenCalledWith(
      `only screen and (-webkit-min-device-pixel-ratio: 1.3), only screen and (min-resolution: 124.800dpi)`
    );
  });

  test('uses cache for equal ratios', () => {
    isHighResolution(1.3);
    isHighResolution(1.3);
    expect(getWindow.win.matchMedia).toHaveBeenCalledTimes(1);
  });

  test('does not use cache for different ratios', () => {
    isHighResolution(1.5);
    isHighResolution(2);
    expect(getWindow.win.matchMedia).toHaveBeenCalledTimes(2);
    expect(getWindow.win.matchMedia).toHaveBeenCalledWith(
      `only screen and (-webkit-min-device-pixel-ratio: 1.5), only screen and (min-resolution: 144.000dpi)`
    );
    expect(getWindow.win.matchMedia).toHaveBeenCalledWith(
      `only screen and (-webkit-min-device-pixel-ratio: 2), only screen and (min-resolution: 192.000dpi)`
    );
  });
});
