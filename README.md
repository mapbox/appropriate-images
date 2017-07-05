# @mapbox/appropriate-images

[![Build Status](https://travis-ci.org/mapbox/appropriate-images.svg?branch=master)](https://travis-ci.org/mapbox/appropriate-images)

🚧🚧 **EXPERIMENTAL! WORK IN PROGRESS!** 🚧🚧

Generate appropriately resized and optimized images into your website, using a configuration that can be shared with client-side libraries.

Images are resized with [sharp](http://sharp.dimens.io/en/stable/), then each size variant is optimized (including the creation of a `webp` version) with [imageming](https://github.com/imagemin/imagemin) plugins.

[`@mapbox/appropriate-images-get-url`] can then be used in the browser to determine which size variant of an image to render, at run time, given an [image configuration] and the available width. Examples:

[@mapbox/appropriate-images-react] can be used to do this in React, with a component that measures its own available width.

## API

### generate

`generate(imageConfig: Object, options: Object): Promise<Array<string>>`

`imageConfig` is an [image configuration].
Options are documented below.

Returns a Promise that resolves with an array of filenames for the resized and optimized images that have been written to your output directory.

When the Promise rejects, it may reject with a single error or an array of errors.

For each image it will:

1. Clear prior output and create temporary size variants.
  - Delete any existing images in the output directory that were previously derived from the source image.
  - Create all the size variants on the source image and put them in a temporary directory.
2. Optimize all (sized) images in the temporary directory, and write the optimized versions to the output directory.

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

**Options**

- **inputDirectory** `string` (required) - Path to your directory of source images.
  The [`basename`]s in your image configuration should be relative to this directory.
- **outputDirectory** `string` (required) - Path to the directory where resized, optimized images should be written.
- **ids** `?Array<string>` - Ids of images to be processed.
  Image ids correspond to keys in the [image configuration].
  If not provided, all images in the configuration will be processed.
- **pngquant** `?Object` - [Options for imageminPngquant](https://github.com/imagemin/imagemin-pngquant#options).
- **mozjpeg** `?Object` - [Options for imageminMozjpeg](https://github.com/imagemin/imagemin-mozjpeg#options).
- **webp** `?Object` - [Options for imageminWebp](https://github.com/imagemin/imagemin-webp#options).

```js
const appropriateImages = require('@mapbox/appropriate-images');
const myImageConfig = require('../path/to/my/image/config.js');

appropriateImages(myImageConfig, {
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

### createCli

`createCli(imageConfig: Object, options: Object): void`

Create a CLI for your specific directory structure, providing a quick way to generate and re-generate images, with nice error handling.

This package exposes the `createCli` function instead of an actual CLI because it is not convenient to completely configure it from the command line.
With `createCli`, you can configure it within a JS file, then run that JS file as a CLI.

```js
#!/usr/bin/env node
'use strict';

const appropriateImages = require('@mapbox/appropriate-images');
const myImageConfig = require('../path/to/my/image/config.js');

const myOptions = {
  inputDirectory: '../path/to/my/source/image/directory/',
  outputDirectory: '../path/to/directory/where/i/want/resized/optimized/images/'
};

createCli(myImageConfig, myOptions);
```

Don't forget to `chmod +x path/to/file` to make it executable.

Then you can run it as a CLI:

```
my-appropriate-images horse bear pig

my-appropriate-images --all --quiet
```

## Image configuration

The image configuration is an object. For every property:

- The key represents the image's `id`.
  This image id is used by all of the fucntions above,
- The value is an object configuring the resizing of that image.

Each image's configuration object includes the following:

### `basename`

`string`

The path from `options.inputDirectory` to the image (including the image's extension).

### `sizes`

`Array<Object>`

An array of objects representing sizes. Each size *must* include a `width`, and can optionally include other properties.

- **width** `number` (required) - A width for the generated image.
- **height** `?number` - The height for the generated image.
  If no `height` is provided, the `width` is used and the image's aspect ratio is preserved.
  If a `height` *is* provided and it does not fit the image's aspect ratio, the image will be cropped.
- **crop** `?string` - Default: `'center'`.
  Defines the manner in which the image will be cropped if both `width` and `height` are provided.
  Must be [a valid `crop` value for sharp](http://sharp.dimens.io/en/stable/api-resize/#crop): `north`, `northeast`, `east`, `southeast`, `south`, `southwest`, `west`, `northwest`, `center`, `centre`, `entropy`, and `attention`.

[`generate`]: #generate
[`createCli`]: #createcli
[image configuration]: #image-configuration
[`basename`]: #basename
[`@mapbox/appropriate-images-get-url`]: https://github.com/mapbox/appropriate-images-get-url
[@mapbox/appropriate-images-react]: https://github.com/mapbox/appropriate-images-react
