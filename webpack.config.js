import path from 'path';
import fs from 'fs'
import webpack from 'webpack';
import HtmlBundlerPlugin from "html-bundler-webpack-plugin"
import CopyPlugin from "copy-webpack-plugin"
import dotenv from 'dotenv';

dotenv.config();
const __dirname = path.resolve();

//Getting all the pages in src/pages and keeping the structure
const pagesDir = path.resolve(__dirname, "src/pages");
const pagesHtmlFiles = getHtmlFiles("./src/pages", pagesDir);

//Creating all the guide pages from markdown to html
const markdownGuides = fs.readdirSync(path.resolve(__dirname, "src/guides"));
let guideHtmlPages = []
for (const markdownGuide of markdownGuides) {
    const guideName = path.parse(markdownGuide).name //Getting the name of the guide without the extension
    guideHtmlPages.push({
        "import": "src/templates/guide.html", //We use the guide template
        "filename": `guides/${guideName}/index.html`,
        "data": {
            markdownGuide: `src/guides/${markdownGuide}`
        }
    })
}

const htmlPages = [...guideHtmlPages, ...pagesHtmlFiles]
const config = {
    mode: 'development',
    devtool: 'source-map',
    resolve: {
        alias: {
            "@images": path.join(__dirname, 'src/images/'),
            "@partials": path.join(__dirname, 'src/partials/'),
            "@root": path.join(__dirname, 'src/root/'),
            "@types": path.join(__dirname, 'src/types/')
        },
        extensions: ['.tsx', '.ts', '.js', ".json"],
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.PUBLIC_SUPABASE_URL': JSON.stringify(process.env.PUBLIC_SUPABASE_URL),
            'process.env.PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(process.env.PUBLIC_SUPABASE_ANON_KEY),
        }),
        new HtmlBundlerPlugin({
            entry: htmlPages,
            js: {
                filename: 'public/js/[name].[contenthash:8].js', // output into dist/assets/js/ directory
            },
            css: {
                filename: 'public/css/[name].[contenthash:8].css', // output into dist/assets/css/ directory
            },
            loaderOptions: {
                sources: [
                    {
                        tag: 'lottie-player',
                        attributes: ['src'],
                    },
                    {
                        tag: 'meta',
                        attributes: ['content'],
                        filter: (tag) => {
                            return tag.attributes.name === 'twitter:image' || tag.attributes.property === 'og:image';
                        },
                    },
                ],
            },
            preprocessorOptions: {
                views: [
                    // path to the directory where *.md files will be searched
                    path.join(__dirname, 'src/guides/'),
                ],
            },
        }),
        new CopyPlugin({
            patterns: [
  {
    from: "**/*",
    to: "public/[path][name][ext]",
    context: "src/pages/public",
  },
],
            options: {
                concurrency: 100,
            },
        })
    ],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: 'tsconfig.webpack.json',
                        },
                    },
                ],
            },
            {
                test: /\.s?css$/,
                use: ['css-loader', 'sass-loader'],
            },
            {
                test: /\.(jpe?g|png|svg|gif|mp3|json)$/i,
                type: "asset/resource",
            },
            {
                test: /\.svg$/i,
                resourceQuery: /raw/, // *.svg?raw
                type: 'asset/source',
            }
        ],
    },
    output: {
        clean: true,
        devtoolModuleFilenameTemplate: '[absolute-resource-path]',
        publicPath: '/'
    }
};
function getHtmlFiles(directory, rootDir) {
    let files = [];

    fs.readdirSync(directory, { withFileTypes: true }).forEach((dirent) => {
        const fullPath = path.join(directory, dirent.name);
        if (dirent.isDirectory()) {
            files = [...files, ...getHtmlFiles(fullPath, rootDir)];
        } 
        else if (dirent.name.endsWith(".html")) {
            const relativePath = path.relative(rootDir, fullPath); // Preserve structure after rootDir
            files.push({ import: fullPath, filename: relativePath });
        }
    });

    return files;
};


export default config;