import React from 'react';
import {Graphics} from '/react-pixi';
import {Point} from 'pixi.js';
import {chain} from 'ramda';

// TODO: Import this from World.js or something.
const flatMapLayers = () => {};

/**
 * Draws the collision polygons.
 * @returns {Element} React element.
 */
const CollisionDebug = ({maps}) => {
  const isCollisions = ({name}) => name === 'Collisions';
  const layerPolygons = (map, layers) => {
    return chain((layer) => {
      if (layer.polygons.length <= 0) {
        return [];
      }
      return layer.polygons.map((points) => {
        return {
          shape: points.map(([x, y]) => new Point(
            x + map.offsetX,
            y + map.offsetY
          )),
          color: 0x452463,
        };
      });
    }, layers);
  };
  const polygons = flatMapLayers(maps, layerPolygons, isCollisions);
  return (
    <Graphics
      ref={(g) => {
        if (g) {
          g.clear();
          for (let i = 0; i < polygons.length; ++i) {
            g.moveTo(polygons[i].offsetX, polygons[i].offsetY);
            g.beginFill(polygons[i].color, 0.5);
            g.drawPolygon(polygons[i].shape);
            g.endFill();
          }
        }
      }}
    />
  );
};

export default CollisionDebug;
