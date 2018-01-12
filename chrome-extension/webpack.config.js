const path = require("path");
const webpack = require("webpack");

const config = {
    entry: {
        background: "./src/background/background.js",
        popup: "./src/popup/popup.js",
        chat: "./src/chat/chat.js",
        dashboard: "./src/dashboard/dashboard.js",
        toolbar: "./src/toolbar/toolbar.js"
    },
    externals: {
        firebase: "firebase",
        react: "React",
        "react-dom": "ReactDOM"
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