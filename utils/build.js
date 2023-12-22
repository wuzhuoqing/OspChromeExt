// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';
process.env.ASSET_PATH = '/';

var webpack = require('webpack'),
  path = require('path'),
  fs = require('fs'),
  config = require('../webpack.config')

delete config.chromeExtensionBoilerplate;

config.mode = 'production';

var buildFolder = path.join(__dirname, '..', 'build');

console.log('checking folder', buildFolder);

console.log('before final webpack', __dirname, config);

try {
  webpack(config, function (err) {
    if (err) {
      console.error('failed to run webpack', err);
      throw err;
    } else {
      console.log('end of webpack run');
    }
  });
}
catch (err) {
  console.error('failed to run webpack', err);
  throw err;
}
console.log('end of final webpack', __dirname);