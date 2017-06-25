# @mapbox/appropriate-images

[![Build Status](https://travis-ci.org/mapbox/appropriate-images.svg?branch=master)](https://travis-ci.org/mapbox/appropriate-images)

🚧🚧 **EXPERIMENTAL! WORK IN PROGRESS!** 🚧🚧

Generate appropriately resized and optimized images into your website, using a configuration that can be shared with client-side libraries.

Images are resized with [sharp](http://sharp.dimens.io/en/stable/), then each size variant is optimized (including the creation of a `webp` version) with [imageming](https://github.com/imagemin/imagemin) plugins.

[`getAppropriateImageUrl`] can be used in the browser to determine which size variant of an image to render, given an [image configuration] and the available width.

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

### getAppropriateImageUrl

**For the browser!**

For your browser bundle, import this directly from `@mapbox/appropriate-images/browser/get-appropriate-image-url`.

`getAppropriateImageUrl(options: Object): string`

This is how the image configuration used for [`generate`], above, can be reused in the browser to select the appropriate image to load at runtime.
Uses the configuration and a width value to figure out the URL of the image variant that should be loaded.

The returned URL will account for

- the available width,
- the resolution of the screen, and
- whether or not the browser supports `webp`.

The image variant that is selected will be **the narrowest variant that is at least as wide as the available width, or else, if the available width exceeds all sizes, the widest variant**.

If you created your image variants with [`generate`], the URLs this function returns should match the paths to resized, optimized images.

**Options**

- **imageId** `string` (required) - Id of the image to be loaded.
  Image ids correspond to keys in the [image configuration].
- **imageConfig** `Object` (required) - You [image configuration].
- **width** `?number` - Default: `Infinity`.
  Not technically required, but you should provide it.
  This is the width available to the image.
  This is key to figuring out which size variant to load.
- **hiResRatio** `?number` - Default: `1.3`.
  The ratio at which you want to consider a screen "high resolution".
  If the browser judges that the screen is high resolution, according to this ratio, the `width` provided will be multiplied by this ratio when determining which size variant to load.
  This means that in a `300px`-wide space but *on a Retina screen*, the image at least `600px` wide will be loaded.
- **imageDirectory** `?string` - If provided, this will be prepended to the URL.

Examples:

```js
const getAppropriateImageUrl = require('@mapbox/appropriate-images/browser/get-appropriate-image-url');

const imageConfig = {
  bear: {
    basename: 'bear.png',
    sizes: [{ width: 300 }, { width: 600 }]
  },
  montaraz: {
    basename: 'montaraz.jpg',
    sizes: [
      { width: 600, height: 500 },
      { width: 1200, height: 800, crop: 'north' },
      { width: 200, height: 200, crop: 'southeast' },
    ]
  }
};

getAppropriateImageUrl({ imageConfig, imageId: 'bear', width: 280 });
// On a regular-resolution screen: bear-300.png or webp
// On a high-resolution screen: bear-600.png or webp

getAppropriateImageUrl({ imageConfig, imageId: 'bear', width: 550 });
// bear-600.png or webp

getAppropriateImageUrl({ imageConfig, imageId: 'bear', width: 800 });
// bear-600.png or webp

getAppropriateImageUrl({
  imageConfig,  
  imageId: 'montaraz',
  width: 400,
  imageDirectory: 'img/optimized/'
});
// On a regular-resolution screen: img/optimized/montaraz-600x500.jpg or webp
// On a high-resolution screen: img/optimized/montaraz-1200x800.jpg or webp
```

**For some examples of using this function in combination with React, check out the [appropriate-images-react](https://github.com/mapbox/appropriate-images-react) repo.**

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
