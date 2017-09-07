import React from 'react';
import {
  DisplayObjectContainer as Container,
  CustomPIXIComponent,
} from '/react-pixi';
import {Sprite, SCALE_MODES} from 'pixi.js';
import {createTextureTiles, fromImage} from '/util/texture.util';
import {findLast} from 'ramda';

const FLIPPED_HORIZONTALLY_FLAG = 0x80000000;
const FLIPPED_VERTICALLY_FLAG   = 0x40000000;
const FLIPPED_DIAGONALLY_FLAG   = 0x20000000;
const GID_MASK = ~(
  FLIPPED_HORIZONTALLY_FLAG | FLIPPED_VERTICALLY_FLAG | FLIPPED_DIAGONALLY_FLAG
);

const cache = {};

const findTileSetForTile = (tileSets, gid) => {
  return findLast(({firstGid}) => gid >= firstGid, tileSets);
};

const Tile = CustomPIXIComponent({
  customDisplayObject({tileSet, id}) {
    if (!cache[tileSet.name]) {
      const {image, margin = 0, spacing = 0, tileHeight, tileWidth} = tileSet;
      const texture = fromImage(
        image.source,
        {scaleMode: SCALE_MODES.NEAREST, transparentColor: {r: 0, g: 0, b: 0}},
      );
      cache[tileSet.name] = createTextureTiles(texture, {
        x: margin,
        y: margin,
        width: image.width,
        height: image.height,
        spacing,
        tileHeight,
        tileWidth,
      });
    }
    const sprite = new Sprite(cache[tileSet.name][id]);
    return sprite;
  },
});
Tile.displayName = 'Tile';

const TileLayer = ({
  layer,
  width,
  height,
  tileWidth,
  tileHeight,
  tileSets,
  offsetX = 0,
  offsetY = 0,
  x = 0,
  y = 0,
}) => {
  const out = [];
  for (let y = 0; y < layer.height; y++) {
    for (let x = 0; x < layer.width; x++) {
      const i = x + (y * layer.width);
      const gid = layer.tiles[i] & GID_MASK;
      if (!gid || x > width || y > height) {
        continue;
      }
      const tileSet = findTileSetForTile(tileSets, gid);
      const dx = (x * tileWidth) + offsetX;
      const dy = (y * tileHeight) + offsetY;
      const id = gid - tileSet.firstGid;
      out.push(
        <Tile key={i} x={dx} y={dy} gid={gid} id={id} tileSet={tileSet}/>
      );
    }
  }
  // TODO: Enable `cacheAsBitmap` in `Container` here.
  // Needs to be done after texture load I think...
  return (
    <Container x={x} y={y}>
      {out}
    </Container>
  );
};

const layerTypes = {
  tile: TileLayer,
};

class Layer extends React.Component {
  shouldComponentUpdate(nextProps) {
    return nextProps.x !== this.props.x || nextProps.y !== this.props.y;
  }
  render() {
    const {layer, ...rest} = this.props;
    const Component = layerTypes[layer.type] || (() => null);
    return <Component layer={layer} {...rest}/>;
  }
}

export default Layer;
