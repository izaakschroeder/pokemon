/* eslint-disable complexity */
/* eslint-disable metalab/babel/no-invalid-this */
import xml2js from 'xml2js';
import zlib from 'zlib';

import sharp from 'sharp';
import {
  always,
  applySpec,
  pipe,
  path,
  chain,
  map,
  fromPairs,
  head,
  pathOr,
  toPairs,
  join,
  filter,
  ifElse,
  replace,
} from 'ramda';
import {join as pathJoin} from 'path';

const int = (x) => parseInt(x, 10);

// const parseProperties =

class ExternalValue {
  constructor(value) {
    this.value = value;
  }
}

class CombinedValues {
  constructor(values) {
    this.values = values;
  }
}

const ref = pipe(
  replace(/^/, './'),
  (value) => new ExternalValue(value),
);

const spread = (...args) => new CombinedValues(args);

const parseData = ({encoding, compression, data}) => {
  switch (encoding) {
  case 'base64':
    return parseData({
      encoding: null,
      compression,
      data: new Buffer(data.trim(), 'base64'),
    });
  case null:
    break;
  default:
    throw new TypeError(`Unknown encoding ${encoding}.`);
  }
  switch (compression) {
  case 'gzip':
    return parseData({
      encoding: null,
      compression: null,
      data: zlib.gunzipSync(data),
    });
  case 'zlib':
    return parseData({
      encoding: null,
      compression: null,
      data: zlib.inflateSync(data),
    });
  case null:
    break;
  default:
    throw new TypeError(`Unknown compression: ${compression}.`);
  }
  const tiles = [];
  for (let i = 0; i < data.length; i += 4) {
    const entry = data.readUInt32LE(i);
    tiles.push(entry);
  }
  return tiles;
};

const isPresent = (x) => x !== undefined;
const omit = always(undefined);

const withContext = (context) => {
  const parseProperties = pipe(
    chain(
      pipe(
        path(['property']),
        map(
          applySpec([
            path(['$', 'name']),
            path(['$', 'value']),
          ])
        ),
      )
    ),
    fromPairs,
  );

  const parseTileSet = applySpec({
    name: path(['$', 'name']),
    firstGid: pipe(path(['$', 'firstgid']), ifElse(isPresent, int, omit)),
    tileWidth: pipe(path(['$', 'tilewidth']), ifElse(isPresent, int, omit)),
    tileHeight: pipe(path(['$', 'tileheight']), ifElse(isPresent, int, omit)),
    tiles: pipe(
      path(['tile']),
      ifElse(
        isPresent,
        pipe(
          map(applySpec([
            pipe(path(['$', 'id']), int),
            pipe(pathOr([], ['properties']), parseProperties),
          ])),
          fromPairs,
        ),
        omit,
      ),
    ),
    image: pipe(
      path(['image']),
      ifElse(
        isPresent,
        pipe(
          map(
            pipe(
              path(['$', 'source']),
              (file) => {
                return sharp(pathJoin(context, file))
                  .metadata()
                  .then((meta) => ({
                    width: meta.width,
                    height: meta.height,
                    source: ref(file),
                  }));
              }
            )
          ),
          head,
        ),
        omit,
      ),
    ),
  });

  const parseMap = applySpec({
    version: path(['$', 'version']),
    orientation: path(['$', 'orientation']),
    width: pipe(path(['$', 'width']), int),
    height: pipe(path(['$', 'height']), int),
    tileWidth: pipe(path(['$', 'tilewidth']), int),
    tileHeight: pipe(path(['$', 'tileheight']), int),
    properties: pipe(pathOr([], ['properties']), parseProperties),
    tileSets: pipe(
      pathOr([], ['tileset']),
      map((tileset) => {
        const source = path(['$', 'source'], tileset);
        if (source) {
          return spread(
            ref(source),
            parseTileSet(tileset),
          );
        }
        return parseTileSet(tileset);
      }),
    ),
    layers: pipe(
      pathOr([], ['layer']),
      map(
        applySpec({
          type: always('tile'),
          name: path(['$', 'name']),
          width: pipe(path(['$', 'width']), int),
          height: pipe(path(['$', 'height']), int),
          tiles: pipe(
            path(['data']),
            head,
            applySpec({
              data: path(['_']),
              encoding: pathOr(null, ['$', 'encoding']),
              compression: pathOr(null, ['$', 'compression']),
            }),
            parseData,
          ),
        })
      )
    ),
  });

  return {parseTileSet, parseMap};
};

const parse = (context, obj) => {
  const {parseMap, parseTileSet} = withContext(context);
  if (obj.map) {
    return parseMap(obj.map);
  } else if (obj.tileset) {
    return parseTileSet(obj.tileset);
  }
  throw new TypeError('Invalid object.');
};

const isPlainObject = (o) => {
  return typeof o === 'object' && o.constructor === Object;
};

const unpromise = (obj) => {
  let awaitables;
  let keys;
  if (Array.isArray(obj)) {
    awaitables = obj.map(unpromise);
    return Promise.all(awaitables);
  } else if (isPlainObject(obj)) {
    awaitables = [];
    keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const a$ = obj[key];
      awaitables.push(unpromise(a$));
    }
    return Promise.all(awaitables).then((results) => {
      const byName = {};
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        byName[key] = results[i];
      }
      return byName;
    });
  }
  return Promise.resolve(obj);
};

const format = (obj) => {
  if (obj === undefined || obj === null) {
    return `${obj}`;
  } else if (typeof obj === 'string' || obj instanceof String) {
    return `"${obj.replace(/"/g, '\\"')}"`;
  } else if (typeof obj === 'boolean' || obj instanceof Boolean) {
    return `${obj}`;
  } else if (typeof obj === 'number' || obj instanceof Number) {
    return `${obj}`;
  } else if (Array.isArray(obj)) {
    const out = pipe(map(format), join(','))(obj);
    return `[${out}]`;
  } else if (obj instanceof ExternalValue) {
    return `require(${format(obj.value)})`;
  } else if (obj instanceof CombinedValues) {
    const out = pipe(map(format), join(','))(obj.values);
    return `Object.assign({}, ${out})`;
  } else if (obj instanceof Object) {
    const out = pipe(
      toPairs,
      filter(([, v]) => {
        return v !== undefined;
      }),
      map(pipe(
        map(format),
        join(':'),
      )),
      join(',')
    )(obj);
    return `{${out}}`;
  }
  throw new TypeError();
};

export default function(data) {
  const cb = this.async();
  const context = this.context;
  const parser = new xml2js.Parser();
  parser.parseString(data, (err, result) => {
    if (err) {
      cb(err);
      return;
    }
    const object = parse(context, result);
    unpromise(object).then(
      (last) => {
        cb(null, `
          module.exports = ${format(last)};
        `);
      },
      cb,
    );
  });
}
