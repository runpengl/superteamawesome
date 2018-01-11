"use strict";

const autoprefixer = require("autoprefixer");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const staticFileRegex = /\.(woff|svg|ttf|eot|gif|jpeg|jpg|png)([\?]?.*)$/;

module.exports = {
    entry: {
        app: [
            path.join(__dirname, "../app/src/app.tsx"),
            path.join(__dirname, "../app/src/app.less"),
        ],
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "../server/public/javascripts"),
    },
    devtool: "cheap-module-inline-source-map",
    resolve: {
        extensions: [".js", ".jsx", ".ts", ".tsx", ".less"]
    },
    module: {
        loaders: [
            // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
            {
                test: /\.tsx?$/,
                loader: "awesome-typescript-loader",
                options: {
                    configFileName: "./app/src/tsconfig.json",
                },
            },

            {
                test: /\.less$/,
                loader: ExtractTextPlugin.extract({
                    fallback: "style-loader",
                    use: "css-loader!less-loader",
                })
            },

            // All font files will be handled by 'file-loader'
            {
                test: /\.(eot|svg|ttf|woff|woff2|jpg|png)$/,
                loader: "file-loader",
            },
        ],
    },
    plugins: [
        new ExtractTextPlugin("../stylesheets/[name].css"),
    ]
};
