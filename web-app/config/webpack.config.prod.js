var webpack = require("webpack");

var defaultConfig = require("./webpack.config");
var prodConfig = Object.assign({}, defaultConfig);

prodConfig.plugins = prodConfig.plugins.concat([
  new webpack.DefinePlugin({
    "process.env": {
      "NODE_ENV": "\"production\"",
    },
  }),

  new webpack.optimize.DedupePlugin(),
]);

module.exports = prodConfig;
