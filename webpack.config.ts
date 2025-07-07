import path from 'path';
import fs from 'fs';
import HtmlBundlerPlugin from 'html-bundler-webpack-plugin';
import Dotenv from 'dotenv-webpack';
import { getProductList } from './stripe-server-helper.js';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { TemplateData, TemplatePage } from './types/webpack.js';


interface Product {
    internalName: string;
    name: string;
    description: string;
    images: string[];
    price_id: string;
    price: number;
    item_id: string;
    status: string;
    displayStatus: string;
}

interface ProductData {
    product: Product | false;
    images: string[];
    description: string | false;
}

type StoreData = Record<string, ProductData>;




import { RoboxProcessor } from './roboxProcessor.js';
import { Eta } from 'eta';

const __dirname = path.resolve();
const eta = new RoboxProcessor({
    defaultExtension: '.html',
    views: path.join(__dirname, ''),
    debug: true,
    useWith: true,
});
// const eta = new RoboxProcessor({
//     defaultExtension: '.html',
//     views: path.join(__dirname, 'src/'),
//     debug: true,
//     useWith: true,
// })






const pagesDir = path.resolve(__dirname, 'src/pages');
const pages = findHtmlPages(pagesDir).map((file) => {
    const relative = path.relative(pagesDir, file);
    return { import: file, filename: relative, data: fetchPageData(file) };
});

let dynamicPages: TemplatePage[] = [...pages];

function fetchPageData(file: string): TemplateData {
    // Add markdown to the page data for tos and privacy pages
    if (file.endsWith('/tos/index.html') || file.endsWith('/privacy/index.html')) {
        let fileComponents = file.split("/");
        let markdownFilename = fileComponents[fileComponents.length - 2];

        const bodyPath = `src/templates/views/legal/${markdownFilename}.md`;
        console.log(`Searching for markdown in: ${bodyPath}`);
        if (fs.existsSync(bodyPath)) {
            try {
                return {
                    body: bodyPath
                }
            } catch (err) {
                console.warn(`Markdown import failed for ${markdownFilename}:`, err);
            }
        } else {
            console.warn(`No markdown file found for ${markdownFilename} page`);
        }
    }

    return {};
}

async function cacheProducts(): Promise<Record<string, Product>> {
    const cache = process.env.FORCE_CACHE === 'true';
    if (cache || !fs.existsSync('products.json')) {
        let newProducts = await getProductList();
        fs.writeFileSync('products.json', JSON.stringify(newProducts), 'utf8');
    }
    return JSON.parse(fs.readFileSync('products.json', 'utf8'));
}
async function processProducts() {
    let products = await cacheProducts();

    const storePages = Object.values(products).map(
        (product) => `./src/pages/shop/product/${product.internalName}.html`
    );

    let storeData = {};
    for (const page of storePages) {
        const productName = path.parse(page).name;
        const product = Object.values(products).find((p) => p.internalName === productName);
        if (!product) {
            console.warn(`Product ${productName} not found in products list.`);
            continue;
        }

        let productData = {
            product,
            images: [""],
            description: "",
        };
        //Searching for images that are in the product folder
        const productImagesPath = `src/images/product/${product.internalName}`;
        console.log(`Searching for images in: ${productImagesPath}`);
        if (fs.existsSync(productImagesPath)) productData.images = fs.readdirSync(productImagesPath).map((file) => path.parse(file).base);
        else {
            console.warn(`Images do not exist for ${product.name}`);
            continue;
        }
        //Searching for description file
        const productDescriptionPath = `src/templates/views/product/descriptions/${product.internalName}.md`;
        console.log(`Searching for description in: ${productDescriptionPath}`);
        if (fs.existsSync(productDescriptionPath)) {
            try {
                productData.description = productDescriptionPath;
            } catch (err) {
                console.warn(`Description import failed for ${product.name}:`, err);
                continue;
            }
        }
        else {
            console.warn(`Description does not exist for ${product.name}`);
            continue
        }

        storeData[product.internalName] = productData;
    }
    createPages(storePages, 'src/templates/views/product/product.html', storeData);

    return products;
}


export default (async () => {
    const products = await processProducts();
    const config = {
        mode: 'development',
        devtool: 'source-map',
        resolve: {
            alias: {
                '@images': path.join(__dirname, 'src/images'),
                '@partials': path.join(__dirname, 'templates/partials'),
                '@root': path.join(__dirname, 'src/root'),
                '@types': path.join(__dirname, 'types'),
            },
            extensions: ['.tsx', '.ts', '.js', '.json'],
        },
        plugins: [
            new HtmlBundlerPlugin({
                entry: dynamicPages,
                js: {
                    filename: 'public/js/[name].[contenthash:8].js'
                },
                css: {
                    filename: 'public/css/[name].[contenthash:8].css'
                },
                filename: ({ filename, chunk }) => {
                    return '[name].html';
                },
                data: {
                    products
                },
                preprocessor: (content, { data }) => eta.renderString(content, data),
                loaderOptions: {
                    sources: [
                        {
                            tag: 'lottie-player',
                            attributes: ['src']
                        },
                        {
                            tag: 'meta',
                            attributes: ['content'],
                            filter: (tag) => {
                                return (
                                    tag.attributes.name === 'twitter:image' ||
                                    tag.attributes.property === 'og:image'
                                );
                            }
                        },
                        {
                            tag: 'script',
                            attributes: ['src'], // Handle <script src="...">
                        },
                                    
                    ]
                },
            }),
            new Dotenv(),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: path.resolve(__dirname, 'src/pages/public'), // source folder
                        to: path.resolve(__dirname, 'build/website/public'),   // destination folder
                        noErrorOnMissing: true, // optional
                    },
                ],
            }),
        ],
        
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: [
                        {
                            loader: 'ts-loader',
                            options: {
                                configFile: 'tsconfig.client.json',
                                transpileOnly: true
                            }
                        }
                    ],
                    exclude: /node_modules/, // Exclude node_modules
                },
                {
                    test: /\.s?css$/,
                    use: ['css-loader', 'sass-loader']
                },

                {
                    test: /\.json$/i,
                    type: 'asset/source'
                },
                {
                    test: /\.svg$/i,
                    oneOf: [
                        {
                            resourceQuery: /raw/, // use ?raw to import as string
                            type: 'asset/source',
                        },
                        {
                            type: 'asset/resource', // default: emit file and return URL
                            generator: {
                                filename: 'public/images/[name]-[contenthash:8].[ext]',
                            },
                        },
                    ],
                },
               {
                test: /\.(png|jpe?g|gif|webp|ico)$/i,
                oneOf: [
                    // JS/TS imports — use responsive-loader
                    {
                    issuer: /\.[jt]sx?$/, // imported from JS/TS files
                    type: 'javascript/auto',
                    use: [
                        {
                        loader: 'responsive-loader',
                        options: {
                            format: 'webp',
                            name: '/public/images[name]-[contenthash:8].[ext]',
                            publicPath: '/',
                        },
                        },
                    ],
                    },
                    // HTML/images in templates — use Webpack's asset modules
                    {
                    type: 'asset/resource',
                    generator: {
                        filename: 'public/images/[name]-[contenthash:8][ext]',
                        publicPath: '/public/images',
                    },
                    },
                ],
                },
            ]
        },
        context: path.resolve(__dirname, '.'),
        output: {
            clean: true,
            path: path.resolve(__dirname, 'build/website/'),
            publicPath: '/',
        },
        watchOptions: {
            ignored: ['**/node_modules'],
        },
    };

    return config;
})();

function findHtmlPages(rootDir: string): string[] {
    const result = [];

    function searchDir(currentDir) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                searchDir(fullPath);
            } else if (entry.isFile() && fullPath.endsWith('.html')) {
                result.push(fullPath);
            }
        }
    }

    searchDir(rootDir);
    return result;
}

function createPages(pages: string[], template: string, data: Record<string, TemplateData>) {
    for (const page of pages) {
        const pageName = path.parse(page).name;

        const relativePath = path.relative(pagesDir, page);
        const directoryPath = path.dirname(relativePath);
        const outputPath = path.join(directoryPath, `${pageName}.html`);
        dynamicPages.push({
            import: template,
            filename: outputPath,
            data: data[pageName] || {
                product: false,
                images: [],
                description: "",
            }
        });
    }
}
