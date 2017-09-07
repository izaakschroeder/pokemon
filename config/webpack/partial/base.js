import {compose, assoc} from 'ramda';
import nearest from 'find-nearest-file';
import path from 'path';
import {NormalModuleReplacementPlugin} from 'webpack';

import {output, loader, alias, plugin} from 'webpack-partial';

const context = path.dirname(nearest('package.json'));

const base = ({name, target}) => compose(
  assoc('target', target),
  alias(
    '@ReactCompositeComponent',
    require.resolve('react-dom/lib/ReactCompositeComponent')
  ),
  plugin(new NormalModuleReplacementPlugin(
    /^\.\/ReactCompositeComponent$/,
    require.resolve('../../../src/react-pixi/ReactCompositeComponent'),
  )),
  // ========================================================================
  // Loaders
  // ========================================================================
  loader({
    loader: 'babel-loader',
    exclude: /(node_modules)/,
    test: /\.js$/,
  }),
  loader({
    loader: [
      require.resolve('../loader/tmx-loader'),
      require.resolve('../loader/npc-loader'),
    ],
    test: /\.(tmx|tsx)$/,
  }),
  loader({
    loader: 'url-loader',
    test: /\.(png|jpg|gif)$/i,
    options: {
      limit: 8192,
    },
  }),
  // ========================================================================
  // Output Settings
  // ========================================================================
  // Define chunk file name pattern. Use the content hash as the filename in
  // production web targeted builds to prevent browser caching between releases.
  output({
    publicPath: `./dist/${name}/`,
    path: path.join(context, 'dist', name),
    ...process.env.NODE_ENV === 'production' && target === 'web' ? {
      filename: '[name].[chunkhash].js',
      chunkFilename: '[id].[name].[chunkhash].js',
    } : {
      filename: '[name].js',
      chunkFilename: '[id].[name].js',
    },
  }),

  // Define an entry chunk. A `name` property must be defined on the initial
  // config object.
  assoc('entry', {
    index: path.join(context, 'entry', `${name}.entry.js`),
  }),

  // Define the build root context as the nearest directory containing a
  // `package.json` file. This is be the absolute path to the project root.
  assoc('context', context),
);

export default base;
