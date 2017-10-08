import resolve from 'rollup-plugin-node-resolve';
import sourcemaps from 'rollup-plugin-sourcemaps';
import commonjs from 'rollup-plugin-commonjs';


export default {
    input: 'lib/sd.js',
    name: 'sd',
    sourcemap: true,
    context: 'window',
    plugins: [
        resolve({
            module: true,
        }),
        commonjs(),
        sourcemaps(),
    ],
    output: {
        format: 'iife',
        file: 'sd.js',
    },
};
