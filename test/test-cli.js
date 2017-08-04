#!/usr/bin/env node
'use strict';

const path = require('path');
const createCli = require('../lib/create-cli');

const imageConfig = {
  bear: {
    basename: 'bear.png',
    sizes: [{ width: 300 }, { width: 768 }]
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
    sizes: [{ width: 768 }, { width: 300, height: 300 }]
  },
  walrus: {
    basename: 'walrus.png',
    sizes: [{ width: 400 }]
  }
};

const options = {
  inputDirectory: path.join(__dirname, './fixtures'),
  outputDirectory: path.join(__dirname, './output')
};

createCli(imageConfig, options);
