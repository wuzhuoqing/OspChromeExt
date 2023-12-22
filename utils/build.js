// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';
process.env.ASSET_PATH = '/';

var webpack = require('webpack'),
  path = require('path'),
  fs = require('fs'),
  config = require('../webpack.config'),
  ZipPlugin = require('zip-webpack-plugin');

delete config.chromeExtensionBoilerplate;

config.mode = 'production';

var packageInfo = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

config.plugins = (config.plugins || []).concat(
  new ZipPlugin({
    filename: `${packageInfo.name}-${packageInfo.version}.zip`,
    path: path.join(__dirname, '../', 'zip'),
  })
);

var buildFolder = path.join(__dirname, '..', 'build');

console.log('checking folder', buildFolder);

if (!fs.existsSync(buildFolder)) {
  console.log('creating folder', buildFolder);
  fs.mkdirSync(buildFolder)
}

console.log('before final webpack', __dirname);

try {
  webpack(config, function (err) {
    if (err) {
      console.error('failed to run webpack', err);
      throw err;
    }
  });
}
catch (err) {
  console.error('failed to run webpack', err);
  throw err;
}
console.log('end of final webpack', __dirname);