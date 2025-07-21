// webpack.prod.ts
import { merge } from 'webpack-merge';
import { createBaseConfig } from './webpack.base.config.js';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';

export default async () => {
    const { base } = await createBaseConfig();
    const plugins = [];
    console.log(1)
    console.log(process.env.ANALYZE);
    if (process.env.ANALYZE === 'true') {

        const { BundleAnalyzerPlugin } = await import('webpack-bundle-analyzer');
        plugins.push(new BundleAnalyzerPlugin({
            analyzerMode: 'server',
            openAnalyzer: true,
        }));
    }
    return merge(base, {
        mode: 'production',
        devtool: false,
        optimization: {
            minimize: true,
            concatenateModules: true,
            minimizer: [
                new TerserPlugin({
                    parallel: true,
                    terserOptions: {
                        compress: { drop_console: true },  // Remove console logs in prod
                    },
                }),
                new CssMinimizerPlugin(),
            ],
            splitChunks: {
                chunks: 'all',
                cacheGroups: {
                    vendors: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        chunks: 'all',
                    },
                },
            },
        },
        plugins: [
            ...plugins,
        ],
        performance: {
            hints: 'warning',
            maxEntrypointSize: 512000, // 500 KB limit for entry points
            maxAssetSize: 512000,
        },
        // Optional: performance hints, minifiers, etc.
    });
    
};