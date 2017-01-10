var webpack = require("webpack");

var defaultConfig = require("./webpack.config");
var prodConfig = Object.assign({}, defaultConfig);

prodConfig.plugins = [
  new webpack.DefinePlugin({
    "process.env": {
      "NODE_ENV": "\"production\"",
    },
  }),

  new webpack.optimize.DedupePlugin(),
  new webpack.optimize.UglifyJsPlugin()
];

module.exports = prodConfig;
