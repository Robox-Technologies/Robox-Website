// webpack.base.ts
import path from 'path';
import fs from 'fs';
import HtmlBundlerPlugin from 'html-bundler-webpack-plugin';
import Dotenv from 'dotenv-webpack';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { Configuration } from 'webpack';
import { RoboxProcessor } from './roboxProcessor.js';
import { getProductList } from './stripe-server-helper.js';
import { Product } from '~types/api.js';
import { TemplateData, TemplatePage } from './types/webpack.js';
import { getCMSCollection } from './cms.js';



const __dirname = path.resolve();
const RECACHE_DURATION = 10 * 60 * 1000;
const pagesDir = path.resolve(__dirname, 'src/pages');
const roboxProcessor = new RoboxProcessor({
    defaultExtension: '.html',
    views: path.join(__dirname, ''),
    debug: true,
    useWith: true,
});

const dynamicPages: TemplatePage[] = [];

const alias = {
    '@images': 'src/images',
    '@partials': 'src/templates/partials',
    '@root': 'src/root',
    '@types': 'types',
};
const aliasPaths = Object.fromEntries(
    Object.entries(alias).map(([key, value]) => [key, path.join(__dirname, value)])
);

function findHtmlPages(rootDir: string): string[] {
    const result: string[] = [];
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(rootDir, entry.name);
        if (entry.isDirectory()) {
            result.push(...findHtmlPages(fullPath));
        } else if (entry.isFile() && fullPath.endsWith('.html')) {
            result.push(fullPath);
        }
    }
    return result;
}

function fetchPageData(file: string): TemplateData {
    const filename = file.replaceAll(path.sep, path.posix.sep);

    if (filename.endsWith('/tos/index.html') || filename.endsWith('/privacy/index.html')) {
        const markdownName = filename.split('/').slice(-2, -1)[0];
        const bodyPath = `src/templates/views/legal/${markdownName}.md`;
        if (fs.existsSync(bodyPath)) {
            return { body: bodyPath };
        }
    }

    return {};
}

async function cacheProducts(): Promise<Record<string, Product>> {
    if (!fs.existsSync('products.json') || process.env.FORCE_CACHE === 'true') {
        return refreshProducts();
    }

    const cacheData = JSON.parse(fs.readFileSync('products.json', 'utf8'));
    if (!cacheData.timestamp || Date.now() - cacheData.timestamp > RECACHE_DURATION) {
        return refreshProducts();
    }

    return cacheData.products || {};
}

async function refreshProducts(): Promise<Record<string, Product>> {
    const products = await getProductList();
    fs.writeFileSync('products.json', JSON.stringify({ timestamp: Date.now(), products }), 'utf8');
    return products;
}

function createPages(pages: string[], template: string, data: Record<string, TemplateData>) {
    for (const page of pages) {
        const name = path.parse(page).name;
        const relativePath = path.relative(pagesDir, page);
        const directoryPath = path.dirname(relativePath);
        dynamicPages.push({
            import: template,
            filename: path.join(directoryPath, `${name}.html`),
            data: data[name] || { product: false, images: [], description: "" }
        });
    }
}
export type HtmlBundlerPluginOptions = ConstructorParameters<typeof HtmlBundlerPlugin>[0];
export const createBaseConfig = async (): Promise<{ base: Configuration, products: Record<string, Product>, htmlBundlerPluginOptions: HtmlBundlerPluginOptions }> => {
    const staticPages = findHtmlPages(pagesDir).map((file) => {
        return { import: file, filename: path.relative(pagesDir, file), data: fetchPageData(file) };
    });

    dynamicPages.push(...staticPages);

    const products = await cacheProducts();
    const storePages = Object.values(products).map(p => `./src/pages/shop/product/${p.internalName}.html`);
    const productData = {};
    for (const page of storePages) {
        const name = path.parse(page).name;
        const product = Object.values(products).find(p => p.internalName === name);
        if (!product) continue;

        const descriptionPath = `src/templates/views/product/descriptions/${name}.md`;
        const imagesPath = `src/images/product/${name}`;
        productData[name] = {
            product,
            description: fs.existsSync(descriptionPath) ? descriptionPath : "",
            images: fs.existsSync(imagesPath) ? fs.readdirSync(imagesPath).map(f => path.parse(f).base) : [],
        };
    }

    createPages(storePages, 'src/templates/views/product/product.html', productData);

    const articles = await getCMSCollection("articles");
    const caseStudies = articles.filter(article => article.type === "case-study");
    // Find the index of the teacher hub to add the case studies
    const teacherHubIndex = dynamicPages.findIndex(article => article.filename === "teacher/index.html");
    if (teacherHubIndex !== -1) {
        dynamicPages[teacherHubIndex].data = {
            caseStudies: caseStudies,
        };
    }
    

    const htmlBundlerPluginOptions = {
        entry: dynamicPages,
        js: { filename: 'public/js/[name].[contenthash:8].js' },
        css: { filename: 'public/css/[name].[contenthash:8].css' },
        filename: () => '[name].html',
        data: { products },
        preprocessor: (content, { data }) => roboxProcessor.renderString(content, data),
        loaderOptions: {
            sources: [
                { tag: 'lottie-player', attributes: ['src'] },
                {
                    tag: 'meta',
                    attributes: ['content'],
                    filter: (tag) => tag.attributes.name === 'twitter:image' || tag.attributes.property === 'og:image',
                },
                { tag: 'script', attributes: ['src'] },
            ],
        },
    }
    const base: Configuration = {
        resolve: {
            alias: aliasPaths,
            extensions: ['.tsx', '.ts', '.js', '.json'],
        },
        context: path.resolve(__dirname, '.'),
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: [{ loader: 'ts-loader', options: { configFile: 'tsconfig.client.json', transpileOnly: true } }],
                    exclude: /node_modules/,
                },
                {
                    test: /\.s?css$/,
                    use: ['css-loader', 'sass-loader'],
                },
                {
                    test: /\.json$/i,
                    type: 'asset/source',
                },
                {
                    test: /\.svg$/i,
                    oneOf: [
                        { resourceQuery: /raw/, type: 'asset/source' },
                        {
                            type: 'asset/resource',
                            generator: { filename: 'public/images/[name]-[contenthash:8].[ext]' },
                        },
                    ],
                },
                {
                    test: /\.(png|jpe?g|gif|webp|ico)$/i,
                    oneOf: [
                        {
                            issuer: /\.[jt]sx?$/,
                            type: 'javascript/auto',
                            use: [{
                                loader: 'responsive-loader',
                                options: {
                                    format: 'webp',
                                    name: '/public/images[name]-[contenthash:8].[ext]',
                                    publicPath: '/',
                                },
                            }],
                        },
                        {
                            type: 'asset/resource',
                            generator: {
                                filename: 'public/images/[name]-[contenthash:8][ext]',
                                publicPath: '/public/images',
                            },
                        },
                    ],
                },
            ],
        },
        plugins: [
            new Dotenv(),
            new HtmlBundlerPlugin({
                entry: dynamicPages,
                js: { filename: 'public/js/[name].[contenthash:8].js' },
                css: { filename: 'public/css/[name].[contenthash:8].css' },
                filename: () => '[name].html',
                data: { products },
                preprocessor: (content, { data }) => {
                    for (const [key, value] of Object.entries(alias)) {
                        // Replace only @key inside include('...') or include("...") paths ETA SPECIFIC
                        content = content.replace(
                            new RegExp(`(include\\(['"\`])${key}`, 'g'),
                            `$1${value}`
                        );
                    }
                    return roboxProcessor.renderString(content, data);
                },
                loaderOptions: {
                    sources: [
                        { tag: 'lottie-player', attributes: ['src'] },
                        {
                            tag: 'meta',
                            attributes: ['content'],
                            filter: (tag) => tag.attributes.name === 'twitter:image' || tag.attributes.property === 'og:image',
                        },
                        { tag: 'script', attributes: ['src'] },
                    ],
                },
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: path.resolve(__dirname, 'src/pages/public'),
                        to: path.resolve(__dirname, 'build/website/public'),
                        noErrorOnMissing: true,
                    },
                ],
            }),
        ],
        output: {
            clean: true,
            path: path.resolve(__dirname, 'build/website'),
            publicPath: '/',
        },
    };

    return { base, products, htmlBundlerPluginOptions };
};
