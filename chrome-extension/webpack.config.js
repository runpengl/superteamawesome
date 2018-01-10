const path = require("path");

const config = {
    entry: {
        background: "./src/background/background.js",
        popup: "./src/popup/popup.js",
        sidebar: "./src/sidebar/sidebar.js",
        toolbar: "./src/toolbar/toolbar.js"
    },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].bundle.js"
    },
    module: {
        rules: [
            { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" }
        ]
    }
};

module.exports = config;