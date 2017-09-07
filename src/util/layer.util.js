const UP = 1;
const RIGHT = 2;
const LEFT = 3;
const DOWN = 4;
const NONE = -1;
/* eslint-disable complexity */
const nextState = (previousState, action) => {
  switch (action) {
  case 1: return UP;
  case 2: return RIGHT;
  case 3: return RIGHT;
  case 4: return LEFT;
  case 5: return UP;
  case 6: return (previousState === UP) ? LEFT : RIGHT;
  case 7: return RIGHT;
  case 8: return DOWN;
  case 9: return (previousState === RIGHT) ? UP : DOWN;
  case 10: return DOWN;
  case 11: return DOWN;
  case 12: return LEFT;
  case 13: return UP;
  case 14: return LEFT;
  case 15: return (previousState === NONE) ? RIGHT : NONE;
  default: return NONE;
  }
};

const hasTile = (map, layer, x, y) => {
  if (x < 0 || y < 0) { return false; }
  if (x >= layer.width || y >= layer.height) { return false; }
  if (x >= map.width || y >= map.height) { return false; }
  return !!layer.tiles[x + (y * layer.width)];
};

const putTile = (layer, x, y, v) => {
  if (x < 0 || y < 0) { return; }
  if (x >= layer.width || y >= layer.height) { return; }
  layer.tiles[x + (y * layer.width)] = v;
};

const findStartingPosition = (map, layer, done) => {
  for (let startY = 0; startY < layer.height; ++startY) {
    for (let startX = 0; startX < layer.width; ++startX) {
      if (hasTile(map, done, startX, startY)) {
        continue;
      }
      const upLeft = hasTile(map, layer, startX - 1, startY);
      const upRight = hasTile(map, layer, startX, startY);
      if (!upLeft && upRight) {
        return {x: startX, y: startY};
      }
    }
  }
  return null;
};

export const calculatePolygons = (map, layer) => {
  const done = {tiles: new Array(layer.tiles.length), width: layer.width};
  const result = [];
  let j = 0;
  let start;

  while ((start = findStartingPosition(map, layer, done)) && j < 2000) {
    let x = start.x;
    let y = start.y;
    const points = [];
    let state = NONE;
    do {
      ++j;
      let action = 0;

      const upLeft = hasTile(map, layer, x - 1, y);
      const upRight = hasTile(map, layer, x, y);
      const downLeft = hasTile(map, layer, x - 1, y + 1);
      const downRight = hasTile(map, layer, x, y + 1);

      putTile(done, x, y, true);

      if (upLeft) {
        action |= 1;
      }
      if (upRight) {
        action |= 2;
      }
      if (downLeft) {
        action |= 4;
      }
      if (downRight) {
        action |= 8;
      }

      const newState = nextState(state, action);
      if (newState !== state) {
        points.push([x * map.tileWidth, (y + 1) * map.tileHeight]);
      }

      state = newState;
      switch (state) {
      case UP: --y; break;
      case DOWN: ++y; break;
      case LEFT: --x; break;
      case RIGHT: ++x; break;
      default: break;
      }
    } while ((x !== start.x || y !== start.y));
    result.push(points);
  }
  return result;
};
