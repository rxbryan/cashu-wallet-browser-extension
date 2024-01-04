const path = require("path");
const webpack = require("webpack");
const FilemanagerPlugin = require("filemanager-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const WextManifestWebpackPlugin = require("wext-manifest-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const BundleAnalyzerPlugin =
  require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}
const nodeEnv = process.env.NODE_ENV;
const viewsPath = path.join(__dirname, "static", "templates");
const destPath = path.join(__dirname, "dist", nodeEnv);

const targetBrowser = process.env.TARGET_BROWSER;

if (!process.env.VERSION) {
  process.env.VERSION = require("./package.json").version;
}

const getExtensionFileType = (browser) => {
  return "zip";
};


module.exports = {
  stats: {
    all: false,
    builtAt: true,
    errors: true,
    hash: true,
  },

  mode: nodeEnv,
  entry: {
    manifest: "./src/manifest.json",
    serviceWorker: "./src/serviceWorker.ts",
    popup: "./src/app/popup/popup.ts",
    options: "./src/app/options/options.ts",
    //welcome: "./src/app/router/Welcome/index.tsx",
  },

  output: {
    path: path.join(destPath, targetBrowser),
    filename: "js/[name].bundle.js",
  },

  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    plugins: [new TsconfigPathsPlugin()],
  },

  module: {
    rules: [
      {
        type: "javascript/auto", // prevent webpack handling json with its own loaders,
        test: /manifest\.json$/,
        use: {
          loader: "wext-manifest-loader",
          options: {
            usePackageJSONVersion: true, // set to false to not use package.json version for manifest
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.(js|ts)x?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              ['@babel/preset-env', { targets: "defaults" }]
            ]
          }
        },
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader, // It creates a CSS file per JS file which contains CSS
          },
          { loader: "css-loader", options: { sourceMap: true } },
          { loader: "postcss-loader", options: { sourceMap: true } },
        ],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: "asset/resource",
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: "asset/resource",
      },
    ],
  },

  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: ["process"],
    }),
    // Plugin to not generate js bundle for manifest entry
    new WextManifestWebpackPlugin(),
    // Generate sourcemaps
    // TODO: reenable
    // new webpack.SourceMapDevToolPlugin({ filename: false }),
    // environmental variables
    new webpack.EnvironmentPlugin([
      "NODE_ENV",
      "TARGET_BROWSER",
      "VERSION",
    ]),
    // delete previous build files
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: [
        path.join(process.cwd(), "dist", nodeEnv, targetBrowser),
        path.join(
          process.cwd(),
          "dist",
          nodeEnv,
          `${targetBrowser}.${getExtensionFileType(targetBrowser)}`
        ),
      ],
      cleanStaleWebpackAssets: false,
      verbose: true,
    }),
    new HtmlWebpackPlugin({
      template: "./src/static/templates/popup.html",
      inject: "body",
      chunks: ["popup"],
      hash: true,
      filename: "popup.html",
    }),
    new HtmlWebpackPlugin({
      template: "./src/static/templates/options.html",
      inject: "body",
      chunks: ["options"],
      hash: true,
      filename: "options.html",
    }),
    /*
    new HtmlWebpackPlugin({
      template: path.join(viewsPath, "prompt.html"),
      inject: "body",
      chunks: ["prompt"],
      hash: true,
      filename: "prompt.html",
    }),
    new HtmlWebpackPlugin({
      template: path.join(viewsPath, "welcome.html"),
      inject: "body",
      chunks: ["welcome"],
      hash: true,
      filename: "welcome.html",
    }),*/
    // write css file(s) to build folder
    new MiniCssExtractPlugin({ filename: "[name].css" }), // No css subfolder has been used as this breaks path's to url's such as fonts.
    // copy static assets
    new CopyWebpackPlugin({
      patterns: [{ from: "./src/static/", to: "assets" }],
    }),
    new BundleAnalyzerPlugin({
      generateStatsFile: nodeEnv !== "development" ? true : false,
      analyzerMode: nodeEnv !== "development" ? "static" : "disabled",
      reportFilename: "../bundle-report.html",
      statsFilename: "../bundle-stats.json",
      openAnalyzer: nodeEnv !== "development",
    }),
  ],
  optimization: {
    minimize: (nodeEnv === "production"),
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          ecma: 6,
          mangle: {
            reserved: ["Buffer", "buffer"],
          },
        },
      }),
      new CssMinimizerPlugin(),
      new FilemanagerPlugin({
        events: {
          onEnd: {
            archive: [
              {
                format: "zip",
                source: path.join(destPath, targetBrowser),
                destination: `${path.join(
                  destPath,
                  targetBrowser
                )}.zip`,
                options: { zlib: { level: 6 } },
              },
            ],
          },
        },
      }),
    ],
  },
  devtool: (nodeEnv === "development") ? "inline-source-map" : ""
};

