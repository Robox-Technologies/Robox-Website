// webpack.prod.ts
import { merge } from 'webpack-merge';
import { createBaseConfig } from './webpack.base.config.js';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';

export default async () => {
    const { base } = await createBaseConfig();

    return merge(base, {
        mode: 'production',
        devtool: false,
        // Optional: performance hints, minifiers, etc.
    });
};