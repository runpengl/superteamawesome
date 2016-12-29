"use strict";

const autoprefixer = require("autoprefixer");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const staticFileRegex = /\.(woff|svg|ttf|eot|gif|jpeg|jpg|png)([\?]?.*)$/;
const autoprefixerConfig = {
    browsers: [
        "> 1%",
        "last 2 versions",
        "Firefox ESR",
        "Opera 12.1",
    ]
};

module.exports = {
    entry: {
        app: [
            path.join(__dirname, "../app/build/src/app.js"),
            path.join(__dirname, "../app/build/src/app.css"),
        ],
    },
    output: {
        filename: "[name].js",
        path: path.join(__dirname, "../server/public/javascripts"),
    },
    devtool: "cheap-module-inline-source-map",
    module: {
        preLoaders: [
            {
                test: /\.js$/,
                loader: "source-map-loader",
            },
            {
                test: /\.css$/,
                loader: "source-map-loader",
            }
        ],
        loaders: [
            {
                test: /\.css$/,
                loader: ExtractTextPlugin.extract("style", "css?sourceMap!postcss"),
            },
            {
                test: staticFileRegex,
                include: [
                    path.resolve(__dirname, "../node_modules"),
                ],
                loader: "file-loader",
                query: {
                    name: "[path][name].[ext]",
                },
            },
            {
                test: /\.json$/,
                loader: "json"
            }
        ],
    },
    plugins: [
        new ExtractTextPlugin("../stylesheets/[name].css"),
    ],
    postcss: function () {
        return [ autoprefixer(autoprefixerConfig) ];
    },
};
