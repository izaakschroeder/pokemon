/* eslint-env browser */
import {BaseTexture, Texture, settings, Rectangle} from 'pixi.js';

const cache = {};

export const fromImage = (src, {
  transparentColor,
  scaleMode = settings.SCALE_MODE,
  density = 1,
} = {}) => {
  if (cache[src]) {
    return cache[src];
  }
  let source = new Image();
  source.src = src;
  if (transparentColor) {
    const img = source;
    const srcCanvas = document.createElement('canvas');
    source = null;
    img.onload = () => {
      srcCanvas.width = img.width;
      srcCanvas.height = img.height;

      // get context to work with
      const srcContext = srcCanvas.getContext('2d');

      // draw the loaded image on the source canvas
      srcContext.drawImage(img, 0, 0);

      // read pixels from source
      const pixels = srcContext.getImageData(0, 0, img.width, img.height);

      // iterate through pixel data (1 pixels consists of 4 ints in the array)
      for (let i = 0, len = pixels.data.length; i < len; i += 4) {
        const r = pixels.data[i];
        const g = pixels.data[i + 1];
        const b = pixels.data[i + 2];

        // if the pixel matches our transparent color, set alpha to 0
        if (
          r === transparentColor.r &&
          g === transparentColor.g &&
          b === transparentColor.b
        ) {
          pixels.data[i + 3] = 0;
        }
      }

      srcContext.putImageData(pixels, 0, 0);

      cache[src].loadSource(srcCanvas);
    };
  }
  cache[src] = new BaseTexture(source, scaleMode, density);
  return cache[src];
};

export const createTextureTiles = (texture, {
  width,
  height,
  tileHeight,
  tileWidth,
  spacing = 0,
  x: bx = 0,
  y: by = 0,
}) => {
  const textures = [];
  for (let y = by; y + tileHeight <= height; y += tileHeight + spacing) {
    for (let x = bx; x + tileWidth <= width; x += tileWidth + spacing) {
      textures.push(new Texture(
        texture,
        new Rectangle(x, y, tileWidth, tileHeight),
      ));
    }
  }
  return textures;
};
