/* global require */
import {
  CustomPIXIComponent,
} from '/react-pixi';
import {Sprite, SCALE_MODES} from 'pixi.js';
import {createTextureTiles, fromImage} from '/util/texture.util';

const sprites = require.context('../sprite', false, /\.png/);

const createCharacter = (id) => {
  const sprite = sprites(`./${id}.png`);
  const texture = fromImage(sprite, {
    scaleMode: SCALE_MODES.NEAREST,
    density: 2,
  });
  const textures = createTextureTiles(texture, {
    tileWidth: 41 / 2,
    tileHeight: 51 / 2,
    width: 124 / 2,
    height: 204 / 2,
  });
  return {
    up: textures.slice(0, 3),
    right: textures.slice(3, 6),
    down: textures.slice(6, 9),
    left: textures.slice(9, 12),
  };
};

const cache = {};

const Character = CustomPIXIComponent({
  customDisplayObject({id = 1, direction}) {
    if (!cache[id]) {
      cache[id] = createCharacter(id);
    }
    const animations = cache[id];
    const sprite = new Sprite(animations[direction][1]);
    sprite.animations = animations;
    // sprite.frame = 0;
    // sprite.width = 32;
    // sprite.height = 16;
    return sprite;
  },
  customApplyProps(sprite, oldProps, newProps) {
    if (newProps.direction && newProps.direction !== oldProps.direction) {
      sprite.texture = sprite.animations[newProps.direction][1];
    }
  },
});

export default Character;
