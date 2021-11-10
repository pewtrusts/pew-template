const webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const mode = process.env.NODE_ENV === 'development' ? 'development' : 'production';
const path = require('path');
const outputFolder = process.env.NODE_ENV === 'preview' ? 'docs/' : process.env.NODE_ENV === 'localpreview' ? 'preview/' : 'dist/';
const isDev = mode === 'development';
const isProd = process.env.NODE_ENV === 'production';

console.log(process.env.COLUMN_SIZE);

const repoName = 'port-states';

/* PUBLIC PATH TK */
const publicPath = isProd ? '/~/media/data-visualizations/interactives/2020/template/' : '';

const copyWebpack = !isProd ? 
    new CopyWebpackPlugin([{
        from: '-/',
        context: 'src',
        to: '-/'
    }, {
        from: 'data/',
        context: 'src',
        to: 'data/'
    }, {
        from: 'assets/',
        context: 'src',
        to: 'assets/',
        ignore: ['Pew/css/**/*.*']
    }, {
        from: 'assets/Pew/css/',
        context: 'src',
        to: 'assets/Pew/css/',
        transform(content, path) {
            if (process.env.NODE_ENV === 'preview') {
                // this modifies the content of the files being copied; here making sure url('/...') is changed so that it will
                // work on gitHub pages where oublic path is /{repoName}/
                // also changes references to 'pew' to refer to 'Pew'
                return content.toString().replace(/url\("\/([^/])/g, 'url("/' + repoName + '/$1').replace(/\/pew\//g, '/Pew/');
            } else {
                return content.toString();
            }
        }
    }]) : 
    new CopyWebpackPlugin([
        {
            from: 'data/',
            context: 'src',
            to: 'data/'
        } 
    ]);

const devToolPlugins = [new webpack.SourceMapDevToolPlugin({
    test: /\.js/,
    filename: '[name]js.map',
    module: true,
    moduleFilenameTemplate: info => {
        return `webpack:///${info.resourcePath}?${info.hash}`;
    },
}), new webpack.SourceMapDevToolPlugin({
    test: /\.css/,
    filename: '[name]css.map',
    module: true,
    moduleFilenameTemplate: info => {
        console.log(info);
        return `webpack:///${info.resourcePath}?${info.hash}`;
    },
})];
const plugins = [
    new HtmlWebpackPlugin({
        title: 'TEMPLATE',
        subtitle: 'template',
        COLUMN_SIZE: process.env.COLUMN_SIZE,
        template: isProd ? './src/index.html' : './submodules/pewmocksite/index-dev.html',
        inject: false,
    }),
    new MiniCssExtractPlugin({
        filename: 'template.css'
    }),
    new webpack.DefinePlugin({
        'PUBLICPATH': '"' + publicPath + '"', // from https://webpack.js.org/plugins/define-plugin/: Note that because the plugin does a direct text replacement, the value given to it must include actual quotes inside of the string itself. Typically, this is done either with alternate quotes, such as '"production"', or by using JSON.stringify('production').
        'BUILDTYPE': '"' + process.env.NODE_ENV + '"', 
    }),
];

function returnJSUse() {
    if ( isDev ){
        return [{
            loader: 'eslint-loader'
        }];
    } else {
        return [/*{
            loader: 'babel-loader',
            options: {
                presets: ['@babel/preset-env']
            }
        },*/
        {
            loader: 'eslint-loader'
        }];
    }
}
const rules = [
    {
            test: /\.js$|\.mjs$/,
            exclude: /node_modules\/(?!(d3-array\/)).*/,
            use: returnJSUse()
        },
        {
            test: /\.css$/,
            use: [
                /**
                 * MiniCssExtractPlugin doesn't support HMR.
                 * For developing, use 'style-loader' instead.
                 * */
                !isDev ? MiniCssExtractPlugin.loader : 'style-loader',
                'css-loader',
                {
                    loader: 'postcss-loader',
                    options: {
                        sourceMap: true,
                        ident: 'postcss',
                        plugins: [
                            require('cssnano'),
                            require('postcss-preset-env')(),
                            require('autoprefixer'),
                        ],
                    }
                },
            ]
        },
    
    {
        test: /\.scss$/,
        use: [
            /**
             * MiniCssExtractPlugin doesn't support HMR.
             * For developing, use 'style-loader' instead.
             * */
            !isDev ? MiniCssExtractPlugin.loader : 'style-loader',
            {
                loader: 'css-loader',
                options: {
                    modules: true,
                    sourceMap: true,
                    importLoaders: 1
                }
            },
            {
                loader: 'postcss-loader',
                options: {
                    sourceMap: true,
                    ident: 'postcss',
                    plugins: [
                        require('cssnano'),
                        require('postcss-preset-env')(),
                        require('autoprefixer'),
                    ],
                }
            },
            {
                loader: 'sass-loader',
                options: {
                    sourceMap: true,
                }
            }
        ]
    },
    {
        test: /\.csv$/,
        loader: 'file-loader',
        options: {
            name: '[path][name].[ext]?v=[hash:6]',
            context: './src' 
        }
    },
    {
        test: /\.html$/,
        exclude: /index.*\.html/,
        use: 'html-loader'
    },
    {
        test: /assets\/.*\.svg$/,
        use: 'svg-url-loader'
    }
];

plugins.push(copyWebpack);

/*if (!isDev) {
    rules.unshift({
        test: /\.js$|\.mjs$/,
        use: [{
            loader: 'babel-loader',
            options: {
                presets: ['@babel/preset-env']
            }
        },
        {
            loader: 'eslint-loader'
        }]
    });
}*/
if ( isProd ){
    plugins.push(...devToolPlugins, new CleanWebpackPlugin());
}
if ( isDev ){
   // plugins.push(new webpack.HotModuleReplacementPlugin());
}
if (!isDev) {
    plugins.push(new CleanWebpackPlugin());
}
module.exports = env => {
    return {
        devServer: {
            hot: false // true not working with Svelte
        },
        devtool: isProd ? false : process.env.NODE_ENV === 'localpreview' ? 'source-map' : 'eval-source-map',
        entry: {
            index: ['./src/index.js']
        },
        mode,
        module: {
            rules
        },
        optimization: {
            minimizer: [
                new TerserPlugin({
                    sourceMap: true,
                    terserOptions: {
                        compress: {
                            drop_console: isProd,
                        },
                    },
                })
            ],
        },
        output: {
            path: __dirname + '/' + outputFolder,
            filename: '[name].js?v=[hash:6]',
            chunkFilename: '[name].[id].js',
        },
        plugins,
        resolve: {
            alias: {
                "@Submodule": path.resolve('submodules'),
                "@Data": path.resolve('src/data'),
                "@Project": path.resolve('src'),
            },
        },
    }
};