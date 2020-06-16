# @mapbox/appropriate-images

[![Build Status](https://travis-ci.org/mapbox/appropriate-images.svg?branch=main)](https://travis-ci.org/mapbox/appropriate-images)

Generate appropriately resized and optimized images for your website, using a configuration object that can be shared with client-side libraries.

Images are resized with [sharp](http://sharp.dimens.io/en/stable/), then each size variant is optimized (including the creation of a `webp` version) with [imagemin](https://github.com/imagemin/imagemin) plugins.

[@mapbox/appropriate-images-get-url] can then be used in the browser to determine which size variant of an image to render, at run time, given an [image configuration] and the available width.

[@mapbox/appropriate-images-react] can be used to do this in React, with a component that automatically measures its own available width.

## Installation

```
npm install @mapbox/appropriate-images
```

## API

### generate

`appropriateImages.generate(imageConfig, [options])`

Returns a Promise that resolves with an array of filenames for the resized and optimized images that have been written to your output directory.

When the Promise rejects, it may reject with a single error or an array of errors.

For each image this function will:

- Clear prior output and create temporary size variants.
  - Delete any existing images in the output directory that were previously derived from the source image.
  - Create all the size variants of the source image and put them in a temporary directory.
    Each size variant is generated in the original format (e.g. `png`) and `webp`.
- Optimize all size variants in the temporary directory, and write those optimized images to the output directory.

Output filenames have suffixes corresponding to the size of the variant.
For example, with the following property in your [image configuration]:

```js
{
  bear: {
    basename: 'bear.png',
    sizes: [
      { width: 300 },
      { width: 600, height: 200 }
    ]
  }
  /* ... */
}
```

You will get files with the following basenames:

- `bear-300.png`
- `bear-300.webp`
- `bear-600x200.png`
- `bear-600x200.webp`

```js
// Example
const appropriateImages = require('@mapbox/appropriate-images');
const myImageConfig = require('../path/to/my/image/config.js');

appropriateImages.generate(myImageConfig, {
  inputDirectory: '../path/to/my/source/image/directory/',
  outputDirectory: '../path/to/directory/where/i/want/resized/optimized/images/'
})
  .then(output => {
    console.log('You generated all these images:');
    console.log(output);
  }).catch(errors => {
    if (Array.isArray(errors)) {
      errors.forEach(err => console.error(err.stack));
    } else {
      console.error(errors.stack);
    }
  });
```

#### imageConfig

Type: `Object`.

An [image configuration] object.
Options for this configuration are documented below.

#### options

##### inputDirectory

Type: `string`.
**Required**.

Path to your directory of source images.
Each [`basename`] in your image configuration should be relative to this directory.

##### outputDirectory

Type: `string`.
**Required**.

Path to the directory where resized, optimized images should be written.

##### ids

Type: `Array<string>`.

Ids of images to be processed.
Image ids correspond to keys in the [image configuration].
If this option not provided, *all* images in the configuration will be processed.

##### pngquant

Type: `Object`.

[Options for imagemin-pngquant](https://github.com/imagemin/imagemin-pngquant#options).

##### mozjpeg

Type: `Object`.

[Options for imagemin-mozjpeg](https://github.com/imagemin/imagemin-mozjpeg#options).

##### webp

Type: `Object`.

[Options for imagemin-webp](https://github.com/imagemin/imagemin-webp#options).

### createCli

`appropriateImages.createCli(imageConfig, [options])`

Executes a CLI for your specific directory structure.
The CLI runs [`generate`] using your specified configuration.
It provides a quick way to generate and re-generate images, with nice error handling.

The arguments are the same as for [`generate`].

**appropriate-images exposes the `createCli` function instead of an actual CLI because it is not convenient to completely configure [`generate`] from the command line, and your configuration should stay constant within a project.**
With `createCli`, you can define your configuration within a JS file, then run that JS file as a CLI.

```js
#!/usr/bin/env node
'use strict';

const appropriateImages = require('@mapbox/appropriate-images');
const myImageConfig = require('../path/to/my/image/config.js');

const myOptions = {
  inputDirectory: '../path/to/my/source/image/directory/',
  outputDirectory: '../path/to/directory/where/i/want/resized/optimized/images/'
};

appropriateImages.createCli(myImageConfig, myOptions);
```

**Don't forget to `chmod +x path/to/file` to make it executable.**

Then you can run it as a CLI:

```bash
my-appropriate-images horse bear pig

my-appropriate-images --all --quiet
```

## Image configuration

The image configuration is an object. For every property:

- The key represents the image's id.
  This image id is used by all of the functions above,
- The value is an object configuring the resizing of that image.

Each image's configuration object includes the following properties.

### basename

Type `string`.
**Required**.

The path from `options.inputDirectory` to the image (including the image's extension).

### sizes

Type: `Array<Object>`.
**Required**.

An array of objects representing sizes. Each size *must* include a `width`, and can optionally include other properties.

#### width

Type: `number`.
**Required**.

A width for the generated image.

#### height

Type: `number`.

A height for the generated image.
If no `height` is provided, the `width` is used and the image's aspect ratio is preserved.
If a `height` *is* provided and it does not fit the image's aspect ratio, the image will be cropped.

#### options

Type: `object`.
Default: `{ fit: "cover" }`

Defines the manner how the image should fit *if both `width` and `height` are provided*. See [resize](https://sharp.pixelplumbing.com/api-resize#resize).


[`generate`]: #generate
[`createCli`]: #createcli
[image configuration]: #image-configuration
[`basename`]: #basename
[@mapbox/appropriate-images-get-url]: https://github.com/mapbox/appropriate-images-get-url
[@mapbox/appropriate-images-react]: https://github.com/mapbox/appropriate-images-react
