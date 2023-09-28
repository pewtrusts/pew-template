/* global process require __dirname */
const webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const pretty = require('pretty');
const PrerenderSPAPlugin = require('prerender-spa-plugin');
const mode = process.env.NODE_ENV === 'development' ? 'development' : 'production';
const path = require('path');
const outputFolder = process.env.NODE_ENV === 'preview' ? 'github/' : process.env.NODE_ENV === 'localpreview' ? 'preview/' : 'dist/';
const isDev = mode === 'development';
const isProd = process.env.NODE_ENV === 'production';


/* CHANGE HERE TO MATCH GITHUB */
const repoName = 'pew-template';

/* PUBLIC PATH TK */
/* change to match SiteCore media library location */
const publicPath = isProd ? '/~/media/data-visualizations/interactives/2022/PathTK/' : process.env.NODE_ENV === 'preview' ? '/' + repoName + '/' : '';

const copyWebpack = new CopyWebpackPlugin({
        patterns: [{
            from: '-/',
            context: 'submodules/pewmocksite',
            to: '-/'
        }, {
            from: 'assets/',
            context: 'submodules/pewmocksite',
            to: 'assets/',
            globOptions: {
                ignore: ['Pew/css/**/*.*']
            }
        }, {
            from: 'assets/Pew/css/',
            context: 'submodules/pewmocksite',
            to: 'assets/Pew/css/',
            transform(content, path) {
                if (process.env.NODE_ENV === 'preview') {
                    // this modifies the content of the files being copied; here making sure url('/...') is changed so that it will
                    // work on gitHub pages where oublic path is /{repoName}/
                    // also changes references to 'pew' to refer to 'Pew'
                    return content.toString().replace(/url\(\/([^/])/g, 'url(/' + repoName + '/$1').replace(/\/pew\//g, '/Pew/');
                } else {
                    return content.toString();
                }
            }
        }]});
const prerender =
    new PrerenderSPAPlugin({
        // Required - The path to the webpack-outputted app to prerender.
        staticDir: path.join(__dirname, outputFolder),
        // Required - Routes to render.
        routes: ['/'],
        renderer: new PrerenderSPAPlugin.PuppeteerRenderer({
            defaultViewport: null,
            //headless: false,
            inject: true,
            injectProperty: 'IS_PRERENDERING',
            renderAfterTime: 3000
            // renderAfterDocumentEvent: 'custom-render-trigger'
        }),
        postProcess: function (renderedRoute) {
            // renderedRoute.html = renderedRoute.html.replace('src="hydrate.js', 'src="' + publicPath + 'hydrate.js');
            renderedRoute.html = renderedRoute.html.replace(/<script.*?src="render.*?<\/script>/, '');
            renderedRoute.html = renderedRoute.html.replace('<link href="styles.css', '<link href="' + publicPath + 'styles.css');
            if (isProd) {
                renderedRoute.html = renderedRoute.html.replace(/<\/?html.*?>|<\/?body.*?>|<\/?head>/g, '');
            }
            renderedRoute.html = pretty(renderedRoute.html);
            return renderedRoute;
        }
    });
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
        template: isProd ? './src/index.ejs' : './submodules/pewmocksite/index-dev.ejs',
        inject: true,
        minify: false
    }),
    new MiniCssExtractPlugin({
        filename: 'styles.css'
    }),
    new webpack.DefinePlugin({
        'PUBLICPATH': '"' + publicPath + '"', // from https://webpack.js.org/plugins/define-plugin/: Note that because the plugin does a direct text replacement, the value given to it must include actual quotes inside of the string itself. Typically, this is done either with alternate quotes, such as '"production"', or by using JSON.stringify('production').
        'BUILDTYPE': '"' + process.env.NODE_ENV + '"',
        'NOHYDRATE': '"' + process.env.NOHYDRATE + '"',
    }),
];

function returnJSUse() {
    if ( isDev ){
        return [{
            loader: 'eslint-loader'
        }];
    } else {
        return [{
            loader: 'babel-loader',
            options: {
                "presets": [
                    ["@babel/preset-env", {
                        "useBuiltIns": "usage",
                        "corejs": "3.32.2"
                    }]
                ]
            }
        },
        {
            loader: 'eslint-loader'
        }];
    }
}
function onwarn(warning, handleWarning) {

    if (warning.code === 'a11y-no-onchange') { return }

    // process as usual 

    handleWarning(warning);
}
const svelteUse = [
    isDev ? {
        loader: 'svelte-loader',
        options: {
            onwarn,
            dev: true

        }
    } : {
        loader: 'svelte-loader',
        options: {
            emitCss: !isDev,
            onwarn,
        }
    }
];

if (!isDev) {
    svelteUse.unshift({
        loader: 'babel-loader',
        options: {
            presets: ['@babel/preset-env']
        }
    });
}
const rules = [
    {
        test: /\.svelte$/,
        use: svelteUse

    },
    {
        test: /\.(woff|woff2)$/,
        use: [{
            loader: 'file-loader',
            options: {
                name: '[path][name].[ext]',
                publicPath: '/',
                context: 'src',
                emitFile: false
            }
        }]
    },
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
                        postcssOptions: {
                            sourceMap: true,
                            ident: 'postcss',
                            plugins: [
                                require('cssnano'),
                                require('postcss-preset-env')(),
                                require('autoprefixer'),
                            ],

                        }
                    }
                },
            ]
        },
    
    {
        test: /\.scss$/,
        exclude: /styles\.scss/,
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
                    postcssOptions: {
                        sourceMap: true,
                        ident: 'postcss',
                        plugins: [
                            require('cssnano'),
                            require('postcss-preset-env')(),
                            require('autoprefixer'),
                        ],
                    }
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
        test: /styles\.scss/,
        include: [
            path.resolve(__dirname, 'src/css'),
        ],
        use: [
            /**
             * MiniCssExtractPlugin doesn't support HMR.
             * For developing, use 'style-loader' instead.
             * */
            !isDev ? MiniCssExtractPlugin.loader : 'style-loader',
            {
                loader: 'css-loader',
                options: {
                    modules: false,
                    sourceMap: true,
                    importLoaders: 1
                }
            },
            {
                loader: 'postcss-loader',
                options: {
                    postcssOptions: {
                        sourceMap: true,
                        ident: 'postcss',
                        plugins: [
                            require('cssnano'),
                            require('postcss-preset-env')(),
                            require('autoprefixer'),
                        ],
                    }
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
        test: /\.(png|jpg)$/,
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
        test: /\.ejs$/,
        use: [{
            loader: 'ejs-loader',
            options: {
                esModule: false
            }
        }]
    },
    {
        test: /map-assets\/.*\.svg$/,
        use: [
            {loader: 'svg-inline-loader?classPrefix'},
            {loader: 'svgo-loader'}
        ]
    }
    
];
if (!isProd){
    plugins.push(copyWebpack);
}

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
const entry = process.env.NOHYDRATE == 'true' ? {
    render: ['./src/index.js'],
} : {
    render: ['./src/index.js'],
    // hydrate: ['./src/hydrate.js']
};
module.exports = env => {
    return {
        devServer: {
            hot: false // true not working with Svelte
        },
        devtool: isProd ? false : process.env.NODE_ENV === 'localpreview' ? 'source-map' : 'eval-source-map',
        entry,
        mode,
        module: {
            rules
        },
        optimization: {
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        sourceMap: true,
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