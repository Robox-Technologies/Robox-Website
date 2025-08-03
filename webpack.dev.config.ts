// webpack.dev.ts
import { merge } from 'webpack-merge';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import { createBaseConfig } from './webpack.base.config.js';

export default async () => {
    const { base } = await createBaseConfig();

    return merge(base, {
        mode: 'development',
        devtool: 'source-map',
        watchOptions: {
            ignored: ['**/node_modules'],
            aggregateTimeout: 300,
            poll: 1000,
        },
        plugins: [
            new ForkTsCheckerWebpackPlugin(),
        ],
    });
};