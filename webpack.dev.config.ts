// webpack.dev.ts
import { merge } from 'webpack-merge';
import LiveReloadPlugin from 'webpack-livereload-plugin';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import WebpackBar from 'webpackbar';
import { createBaseConfig } from './webpack.base.config.js';

export default async () => {
    const { base } = await createBaseConfig();

    return merge(base, {
        mode: 'development',
        devtool: 'source-map',
        cache: { type: 'filesystem' },
        watchOptions: {
            ignored: ['**/node_modules'],
            aggregateTimeout: 300,
            poll: 1000,
        },
        plugins: [
            new ForkTsCheckerWebpackPlugin(),
            new WebpackBar({ name: '🚀 Building Ro/Box' }),
            new LiveReloadPlugin({ appendScriptTag: true, delay: 300 }),
        ],
    });
    
};