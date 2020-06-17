#!/usr/bin/env node
'use strict';

const path = require('path');
const createCli = require('../lib/create-cli');

const imageConfig = {
  bear: {
    basename: 'bear.png',
    sizes: [{ width: 300 }, { width: 600 }]
  },
  montaraz: {
    basename: 'montaraz.jpg',
    sizes: [
      { width: 300, height: 500 },
      { width: 1200, options: { gravity: 'north' } },
      { width: 200, height: 200, options: { gravity: 'southeast' } },
      { width: 210, height: 210, options: { gravity: 'northwest' } }
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
  inputDirectory: path.join(__dirname, './fixtures'),
  outputDirectory: path.join(__dirname, './output')
};

createCli(imageConfig, options);
