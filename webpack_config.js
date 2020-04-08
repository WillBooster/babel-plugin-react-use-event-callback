const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  devtool: 'sourcemap',
  entry: [path.resolve(__dirname, 'src/main.ts')],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'babel-plugin-react-use-event-callback.js',
    library: '',
    libraryTarget: 'commonjs2',
  },
  resolve: {
    modules: ['node_modules'],
    extensions: ['.js', '.ts'],
  },
  mode: 'none',
  target: 'node',
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.BannerPlugin({
      banner: 'require("source-map-support").install();',
      entryOnly: false,
      raw: true,
    }),
  ],
  externals: [nodeExternals()],
  node: {
    __dirname: false,
    __filename: true,
  },
};
