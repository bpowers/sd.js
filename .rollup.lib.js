import resolve from 'rollup-plugin-node-resolve';
import sourcemaps from 'rollup-plugin-sourcemaps';
import commonjs from 'rollup-plugin-commonjs';


export default {
	input: 'build/sd.js',
	context: 'window',
	plugins: [
		resolve({
			module: true,
		}),
		commonjs({
			namedExports: {
				'node_modules/mustache/mustache.js': [ 'render' ]
			}
		}),
		sourcemaps(),
	],
	output: {
		name: 'sd',
		sourcemap: true,
		format: 'iife',
		file: 'sd.js',
	},
};
