const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

const banner = `
  Copyright (c) 2017-2022 Kenny Do and CAD Team (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
  Licensed under MIT (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
`;

const moduleRules = [
  {
    test: /\.tsx?$/,
    exclude: /node_modules/,
    use: [{ loader: 'ts-loader' }],
  },
  { enforce: 'pre', test: /\.js$/, loader: 'source-map-loader' },
];

const resolve = {
  extensions: ['.mjs', '.tsx', '.ts', '.js', '.json', '.png'],
};

const externals = {
  'redux-webext': 'ReduxWebExt',
};

const output = {
  path: `${__dirname}/extension/bundles`,
};

const backgroundConfig = {
  name: 'background',
  mode: 'production',
  target: 'webworker',
  entry: {
    background: `${__dirname}/src/background.ts`,
  },
  externals,
  output: {
    ...output,
    filename: 'background.bundle.js',
  },
  module: { rules: moduleRules },
  plugins: [new webpack.BannerPlugin(banner)],
  resolve,
  optimization: {
    splitChunks: false,
  },
};

const uiConfig = {
  name: 'ui',
  mode: 'production',
  target: 'web',
  entry: {
    popup: `${__dirname}/src/ui/popup/index.tsx`,
    setting: `${__dirname}/src/ui/settings/index.tsx`,
  },
  externals,
  output: {
    ...output,
    filename: '[name].bundle.js',
  },
  module: { rules: moduleRules },
  plugins: [
    new webpack.BannerPlugin(banner),
    new CopyPlugin({
      patterns: [
        {
          force: true,
          from: 'bootstrap/dist/css/bootstrap.min.css*',
          to: '../../extension/global_files/[name][ext]',
          context: `${__dirname}/node_modules`,
        },
        {
          force: true,
          from: 'bootstrap/dist/js/bootstrap.bundle.min.js*',
          to: '../../extension/global_files/[name][ext]',
          context: `${__dirname}/node_modules`,
        },
        {
          force: true,
          from: 'jquery/dist/jquery.slim.min*',
          to: '../../extension/global_files/[name][ext]',
          context: `${__dirname}/node_modules`,
        },
        {
          force: true,
          from: 'webextension-polyfill/dist/browser-polyfill.min.js*',
          to: '../../extension/global_files/[name][ext]',
          context: `${__dirname}/node_modules`,
        },
      ],
    }),
  ],
  resolve,
  optimization: {
    splitChunks: false,
  },
};

module.exports = [backgroundConfig, uiConfig];
