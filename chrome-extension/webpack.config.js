const path = require("path");
const webpack = require("webpack");

const config = {
    entry: {
        background: "./src/background/background.js",
        popup: "./src/popup/popup.js",
        sidebar: "./src/sidebar/sidebar.js",
        toolbar: "./src/toolbar/toolbar.js",
        common: ["classnames", "react", "react-dom"]
    },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].bundle.js"
    },
    module: {
        rules: [
            { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" }
        ]
    },
    plugins: [
        new webpack.optimize.CommonsChunkPlugin({
            name: "common"
        })
    ]
};

module.exports = config;