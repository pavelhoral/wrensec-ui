import nodeResolve from '@rollup/plugin-node-resolve';

export default {
    external: /node_modules/,
	input: 'src/index.js',
    plugins: [
        nodeResolve(),
    ],
	output: {
		file: 'dist/index.cjs',
		format: 'cjs',
	},
};
