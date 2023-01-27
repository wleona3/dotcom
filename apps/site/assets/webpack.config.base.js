const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const webpack = require("webpack");
const path = require("path");
const postcssPresetEnv = require("postcss-preset-env");
const sass = require("sass");

const babelLoader = {
  loader: "babel-loader",
  options: {
    configFile: "./babel.config.js",
    cacheDirectory: true
  }
};

const tsLoader = {
  loader: "ts-loader",
  options: {
    configFile: "tsconfig.webpack.json",
    transpileOnly: true,
    experimentalWatchApi: true
  }
};

module.exports = {
  entry: {
    app: ["./js/app-entry.js"],
    core: ["./js/core.js"], // For core.css only, not js
    map: ["./js/leaflet-css.js"], // For leaflet.css only, not js
    tnm: ["./ts/transit-near-me-entry.ts"],
    tripplanner: ["./ts/trip-planner-entry.ts"],
    vote: ["./ts/vote-map-entry.ts"],
    stop: ["./ts/stop-entry.ts"],
    leaflet: ["./ts/leaflet-entry.ts"],
    schedule: ["./ts/schedule-entry.ts"],
    tripplanresults: ["./ts/trip-plan-results-entry.ts"],
    tripcompareresults: ["./ts/trip-compare-results-entry.ts"],
    projects: ["./ts/projects-entry.ts"],
    iewarning: ["./ts/ie-warning-entry.ts"],
    hydrator: ["./ts/helpers/react-hydrator.ts"]
  },

  stats: {
    assets: false,
    builtAt: true,
    cachedAssets: true,
    chunkGroups: true,
    colors: true,
    entrypoints: false,
    env: true,
    errors: true,
    errorDetails: true,
    hash: true,
    modules: false,
    publicPath: false,
    reasons: false,
    source: false,
    timings: true,
    usedExports: true,
    version: true,
    warnings: true
  },

  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        include: path.resolve(__dirname, 'ts/'),
        exclude: [/__tests__/, path.resolve(__dirname, "ts/coverage"), path.resolve(__dirname, "ts/ts-build/")],
        use: [babelLoader, tsLoader]
      },
      {
        test: /\.(js)$/,
        include: path.resolve(__dirname, 'js/'),
        exclude: [path.resolve(__dirname, "js/test/")],
        use: babelLoader
      },
      {
        test: /\.svg$/,
        include: path.resolve(__dirname, 'static/'),
        exclude: [path.resolve(__dirname, 'static/fonts/')],
        use: [
          { loader: "svg-inline-loader" },
          {
            loader: "svgo-loader",
            options: {
              plugins: [
                {
                  name: "removeTitle",
                  active: "false"
                }, 
                {
                  name: "removeAttrs",
                  params: {
                    "attrs": ["id"]
                  }
                }
              ]
            }
          }
        ]
      },
      {
        test: /\.scss$/,
        include: path.resolve(__dirname, 'css/'),
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          {
            loader: "css-loader",
            options: { 
              importLoaders: 1,
              url: false
            }
          },
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: [
                  postcssPresetEnv({
                    autoprefixer: { grid: true }
                  })
                ]
              }
            }
          },
          {
            loader: "sass-loader",
            options: {
              sassOptions: {
                includePaths: [
                  "node_modules/bootstrap/scss",
                  "node_modules/font-awesome/scss"
                ],
                outputStyle: "compressed",
                quietDeps: true
              }
            }
          }
        ]
      }
    ]
  },

  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          ecma: 5,
          format : {
            comments: false,
          },
        },
        extractComments: false
      }),
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            "default",
            {
              discardComments: { removeAll: true },
            },
          ],
        },
      })
    ]
  },

  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "static/**/*", to: "../../" },
        { from: "node_modules/focus-visible/dist/focus-visible.min.js", to: "../js" },
        { from: "node_modules/smoothscroll-polyfill/dist/smoothscroll.min.js", to: "../js" },
      ]
    }),
    new MiniCssExtractPlugin({ filename: "../css/[name].css" }),
    new webpack.ProvidePlugin({
      Turbolinks: "turbolinks",
      Tether: "tether",
      "window.Tether": "tether",
      $: "jquery",
      jQuery: "jquery",
      "window.jQuery": "jquery",
      "window.$": "jquery",
      phoenix: "phoenix",
      autocomplete: "autocomplete.js"
    })
  ],

  resolve: {
    symlinks: false,
    extensions: [".tsx", ".ts", ".jsx", ".js"]
  }
};
