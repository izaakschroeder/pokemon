import React from 'react';
import Layer from './Layer';
import {DisplayObjectContainer as Container} from '/react-pixi';
import {calculatePolygons} from '/util/layer.util';
import {map, values, filter, chain, omit} from 'ramda';
import PF from 'pathfinding';

const loadMap = (x, y) => {
  // console.log('TRY LOAD:', `../map/${x}.${y}.tmx`);
  return import(`../map/${x}.${y}.tmx`).then((map) => {
    map.name = `${x},${y}`;
    map.x = x;
    map.y = y;
    map.yOffsetModifier = parseInt(map.properties.yOffsetModifier, 10) / 2;
    map.xOffsetModifier = parseInt(map.properties.xOffsetModifier, 10) / 2;
    return map;
  });
};

const renderLayers = (m, layers) => (
  map((layer) => (
    <Layer
      key={`${m.name}-${layer.id}`}
      x={m.offsetX}
      y={m.offsetY}
      layer={layer}
      width={m.width}
      height={m.height}
      tileWidth={m.tileWidth}
      tileHeight={m.tileHeight}
      tileSets={m.tileSets}
    />
  ), layers)
);

const TOP = 'top';
const LEFT = 'left';
const BOTTOM = 'bottom';
const RIGHT = 'right';

const loopGridEdge = (grid, direction, cb) => {
  switch (direction) {
  case TOP:
    for (let x = 0; x < grid[0].length; ++x) {
      cb(x, 0, grid[0][x]);
    }
    break;
  case LEFT:
    for (let y = 0; y < grid.length; ++y) {
      cb(0, y, grid[y][0]);
    }
    break;
  case BOTTOM:
    for (let x = 0; x < grid[0].length; ++x) {
      cb(x, grid.length - 1, grid[grid.length - 1][x]);
    }
    break;
  case RIGHT:
    for (let y = 0; y < grid.length; ++y) {
      cb(grid[0].length - 1, y, grid[y][grid[0].length - 1]);
    }
    break;
  default:
    throw new TypeError();
  }
};

const walkability = (grid, direction) => {
  let lastEntrance = false;
  const entrances = [];
  loopGridEdge(grid, direction, (x, y, val) => {
    if (val === 0) {
      if (!lastEntrance) {
        lastEntrance = true;
        entrances.push({direction, x, y});
      }
    } else {
      lastEntrance = false;
    }
  });
  return entrances;
};

const flatMapLayers = (maps, mapper, fn) => {
  return chain(
    (map) => {
      if (!map) {
        return [];
      }
      const backLayers = filter(fn, map.layers);
      return mapper(map, backLayers);
    },
    values(maps),
  );
};

class World extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      error: null,
      maps: {},
      origin: {x: 0, y: 0},
    };
  }

  getMap(x, y) {
    return this.state.maps[`${x}|${y}`];
  }

  unloadMap(x, y) {
    const map = this.getMap(x, y);
    this.setState({
      maps: omit([`${x}|${y}`], this.state.maps),
    }, () => {
      this.props.onUnload(map);
    });
  }

  loadMap(x, y, previous) {
    if (`${x}|${y}` in this.state.maps) {
      return Promise.resolve(this.getMap(x, y));
    }
    this.setState({
      loading: true,
      maps: {
        ...this.state.maps,
        [`${x}|${y}`]: null,
      },
    });
    return loadMap(x, y).then((map) => {
      map.layers.forEach((layer, i) => {
        layer.id = i;
      });
      map.layers.forEach((layer) => {
        // Ledges
        if (!/Collisions|Water|Grass|Ledges/.test(layer.name)) {
          layer.polygons = [];
          return;
        }
        layer.polygons = calculatePolygons(map, layer);
      });

      const walkable = [];
      map.layers.forEach((layer) => {
        if (/Water|Grass|Walkable/.test(layer.name)) {
          for (let y = 0; y < Math.min(layer.height, map.height); ++y) {
            if (!walkable[y]) {
              walkable[y] = [];
            }
            for (let x = 0; x < Math.min(layer.width, map.width); ++x) {
              if (layer.tiles[layer.width * y + x]) {
                walkable[y][x] = 0;
              }
            }
          }
        }
      });
      map.layers.forEach((layer) => {
        if (/Collisions/.test(layer.name)) {
          for (let y = 0; y < Math.min(layer.height, map.height); ++y) {
            if (!walkable[y]) {
              walkable[y] = [];
            }
            for (let x = 0; x < Math.min(layer.width, map.width); ++x) {
              if (layer.tiles[layer.width * y + x]) {
                walkable[y][x] = 1;
              }
            }
          }
        }
      });
      map.walkable = new PF.Grid(walkable);

      const reachable = (sources, targets) => {
        const finder = new PF.AStarFinder();
        return sources.some((source) => {
          return targets.some((target) => {
            return finder.findPath(
              source.x,
              source.y,
              target.x,
              target.y,
              map.walkable,
            );
          });
        });
      };

      const left = walkability(walkable, LEFT);
      const top = walkability(walkable, TOP);
      const right = walkability(walkable, RIGHT);
      const bottom = walkability(walkable, BOTTOM);

      map.directions = {
        left: reachable(left, [...top, ...right, ...bottom]),
        top: reachable(top, [...left, ...right, ...bottom]),
        right: reachable(right, [...top, ...left, ...bottom]),
        bottom: reachable(bottom, [...top, ...right, ...left]),
      };

      map.offsetX = 0;
      map.offsetY = 0;

      if (previous) {
        // to the left
        if (x < previous.x) {
          map.offsetX = previous.offsetX + -map.width * map.tileWidth;
          map.offsetY = previous.offsetY + (
            map.yOffsetModifier - previous.yOffsetModifier
          );
        } else if (y < previous.y) {
          map.offsetY = previous.offsetY + -map.height * map.tileHeight;
          map.offsetX = previous.offsetX + (
            map.xOffsetModifier - previous.xOffsetModifier
          );
        } else if (x > previous.x) {
          map.offsetX = previous.offsetX + previous.width * map.tileWidth;
          map.offsetY = previous.offsetY + (
            map.yOffsetModifier - previous.yOffsetModifier
          );
        } else if (y > previous.y) {
          map.offsetY = previous.offsetY + previous.height * map.tileHeight;
          map.offsetX = previous.offsetX + (
            map.xOffsetModifier - previous.xOffsetModifier
          );
        }
      }
      map.loadNext = () => {
        if (map.directions.left) {
          this.loadMap(x - 1, y, map);
        }
        if (map.directions.right) {
          this.loadMap(x + 1, y, map);
        }
        if (map.directions.top) {
          this.loadMap(x, y - 1, map);
        }
        if (map.directions.bottom) {
          this.loadMap(x, y + 1, map);
        }
      };

      this.setState({
        loading: false,
        error: null,
        maps: {
          ...this.state.maps,
          [`${x}|${y}`]: map,
        },
      }, () => {
        this.props.onLoad(map);
        // Uncomment this to load the entire world.
        // map.loadNext();
      });

      return Promise.resolve(map);
    }, (err) => {
      this.setState({
        loading: false,
        error: err,
        maps: {
          ...this.state.maps,
          [`${x}|${y}`]: null,
        },
      });
    });
  }

  componentDidMount() {
    this.loadMap(0, 0);
  }

  render() {
    const {maps} = this.state;
    const {children, position} = this.props;
    const isBackLayer = ({name}) => name !== 'WalkBehind';
    const isFrontLayer = ({name}) => name === 'WalkBehind';

    return (
      <Container position={position}>
        {flatMapLayers(maps, renderLayers, isBackLayer)}
        {children}
        {flatMapLayers(maps, renderLayers, isFrontLayer)}
      </Container>
    );
  }
}

export default World;
