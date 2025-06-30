const rules = require('./webpack.rules');
const path = require('path');

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

module.exports = {
  mode: 'development',
  target: 'electron-renderer',
  entry: './src/renderer/index.tsx',
  devtool: 'source-map',
  module: {
    rules,
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
    fallback: {
      "path": false,
      "fs": false,
      "child_process": false,
    }
  },
  output: {
    path: path.resolve(__dirname, 'src/renderer'),
    filename: 'main.js',
  },
}; 