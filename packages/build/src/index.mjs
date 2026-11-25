/*
 * The contents of this file are subject to the terms of the Common Development and
 * Distribution License (the License). You may not use this file except in compliance with the
 * License.
 *
 * You can obtain a copy of the License at legal/CDDLv1.1.txt. See the License for the
 * specific language governing permission and limitations under the License.
 *
 * When distributing Covered Software, include this CDDL Header Notice in each file and include
 * the License file at legal/CDDLv1.1.txt. If applicable, add the following below the CDDL
 * Header, with the fields enclosed by brackets [] replaced by your own identifying
 * information: "Portions copyright [year] [name of copyright owner]".
 *
 * Copyright 2023-2026 Wren Security.
 */
import { existsSync } from "fs";
import { cp, mkdir, readFile, writeFile } from "fs/promises";
import gulp from "gulp";
import { createRequire } from "module";
import { dirname, join } from "path";
import { Transform } from "stream";
import { finished } from "stream/promises";
import { fileURLToPath } from "url";

/**
 * @typedef {import("gulp").TaskFunction} TaskFunction
 */

/**
 * @typedef {Object} ModuleResourcesOptions
 * @property {string} dest - target path (defaults to `dist`)
 * @property {string|URL} path - base path for the NodeJS module resolver
 */

/**
 * Resolve Node module resource path.
 * Files that are not exported by the package (`exports` field in package.json, e.g. UMD builds)
 * are looked up directly in node_modules directories.
 * @param {NodeJS.Require} require - NodeJS module resolver
 * @param {string} resource - module resource (e.g. `react/umd/react.production.min.js`)
 * @return {string} resolved file path
 */
function resolveModuleResource(require, resource) {
    try {
        return require.resolve(resource);
    } catch (error) {
        // Only files within a package can be looked up (not a bare package name)
        const match = resource.match(/^((?:@[^/]+\/)?[^/]+)\/(.+)$/);
        if (error.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED" || !match) {
            throw error;
        }
        const [, name, subpath] = match;
        const source = (require.resolve.paths(name) || [])
            .map((path) => join(path, name, subpath))
            .find((path) => existsSync(path));
        if (!source) {
            throw error;
        }
        return source;
    }
}

/**
 * Copy specific Node module resources.
 * @param {Record<string, string>} resources - resource map
 * @param {ModuleResourcesOptions} [options]
 * @return {TaskFunction}
 */
export function useModuleResources(resources, options = {}) {
    const require = createRequire(options.path || import.meta.url);
    return async () => {
        for (const [module, target] of Object.entries(resources)) {
            const source = resolveModuleResource(require, module);
            const destination = join(options.dest || "dist", target);
            await mkdir(dirname(destination), { recursive: true });
            await cp(source, destination);
        }
    };
}

/**
 * @typedef {Object} LocalResourcesOptions
 * @property {string} base - source base path (defaults to empty string)
 * @property {string} dest - target base path (defaults to `dist`)
 */

/**
 * Copy specific local resources (supports glob patterns).
 * @param {Record<string, string>} resources - resource map
 * @param {LocalResourcesOptions} [options]
 * @return {TaskFunction}
 */
export function useLocalResources(resources, options = {}) {
    return async () => {
        for (const [source, target] of Object.entries(resources)) {
            await finished(gulp
                .src(source, {
                    cwd: options.base || process.cwd(),
                    encoding: false
                })
                .pipe(gulp.dest(join(options.dest || "dist", target))));
        }
    };
}

/**
 * @typedef {Object} LessStylesOptions
 * @property {string} base - base path for imports (defaults to `dist`)
 * @property {string} dest - target path (defaults to `dist`)
 */

/**
 * Build Less styles.
 * @deprecated Less support will be removed in 25.0, use {@link useScssStyles} instead.
 * @param {Record<string, string>} resources - resource map
 * @param {LessStylesOptions} [options]
 * @returns {TaskFunction}
 */
export function useLessStyles(resources, options = {}) {
    return async () => {
        console.warn("[commons-ui-build] useLessStyles is deprecated and will be removed in 25.0, "
            + "use useScssStyles instead.");
        const less = (await import("less")).default;
        const postcss = (await import("postcss")).default;
        const minify = (await import("postcss-minify")).default;
        for (const [source, target] of Object.entries(resources)) {
            // Build using Less
            const rendered = await less.render(await readFile(source, "utf-8"), {
                filename: source,
                paths: options.base || "dist",
                rewriteUrls: "local"
            });
            // Process using PostCSS (we want to drop Less in the future)
            const processed = await postcss([ minify() ]).process(rendered.css, {
                from: source
            });
            const destination = join(options.dest || "dist", target);
            await mkdir(dirname(destination), { recursive: true });
            await writeFile(destination, processed.css);
        }
    };
}

/**
 * @typedef {Object} ScssStylesOptions
 * @property {string} base - base path for resolving imports (defaults to `dist`)
 * @property {string} dest - target path (defaults to `dist`)
 */

/**
 * Build SCSS styles using Sass. Modules are resolved from the base path, `pkg:` URLs from Node packages installed
 * with this package (which brings Bootstrap and Font Awesome used by commons styles) or by the application.
 * Plain CSS imports (`@import "library.css";`) are inlined with their relative URLs rebased to the target file.
 * Other relative URLs are relative to the target file. Warnings of dependencies (stylesheets loaded through the base
 * path or Node packages) are not reported. The result is minified.
 * @param {Record<string, string>} resources - resource map
 * @param {ScssStylesOptions} [options]
 * @returns {TaskFunction}
 */
export function useScssStyles(resources, options = {}) {
    return async () => {
        const sass = await import("sass");
        const postcss = (await import("postcss")).default;
        const postcssImport = (await import("postcss-import")).default;
        const postcssUrl = (await import("postcss-url")).default;
        const minify = (await import("postcss-minify")).default;
        const base = options.base || "dist";
        const processor = postcss([
            postcssImport({ path: [base] }),
            postcssUrl({ url: "rebase" }),
            minify()
        ]);
        for (const [source, target] of Object.entries(resources)) {
            const destination = join(options.dest || "dist", target);
            const compiled = await sass.compileAsync(source, {
                loadPaths: [base],
                // Node packages of commons (e.g. Bootstrap) are resolved from this package, which depends on them
                importers: [new sass.NodePackageImporter(dirname(fileURLToPath(import.meta.url)))],
                // Deprecation warnings of dependencies (e.g. Bootstrap) cannot be fixed by the application
                quietDeps: true
            });
            const processed = await processor.process(compiled.css, {
                from: destination,
                to: destination
            });
            await mkdir(dirname(destination), { recursive: true });
            await writeFile(destination, processed.css);
        }
    };
}

/**
 * @typedef {Object} EslintOptions
 * @property {string} src - source glob pattern (defaults to `src/scripts/**\/*.{js,mjs}`)
 */

/**
 * Lint scripts using ESLint.
 * @param {EslintOptions} [options]
 * @returns {TaskFunction}
 */
export function useEslint(options = {}) {
    return async () => {
        const eslint = (await import("gulp-eslint-new")).default;
        // XXX Why not replace with manual iteration?
        await finished(gulp.src(options.src || "src/scripts/**/*.js")
            .pipe(eslint())
            .pipe(eslint.format())
            .pipe(eslint.failAfterError())
            .resume());
    };
}


/**
 * @typedef {Object} BuildScriptsOptions
 * @property {string} src - source glob pattern (defaults to `src/scripts/**\/*.{js,jsm}`)
 * @property {string} dest - target path (defaults to `dist/js`)
 * @property {string[]} presets - array with Babel presets (defaults to `["@babel/preset-env"]`)
 * @property {string[]} plugins - array with Babel plugins (defaults to `["@babel/plugin-transform-modules-amd"]`)
 */

/**
 * Build ESM based scripts (i.e. transpile and copy).
 * @param {BuildScriptsOptions} [options]
 * @return {TaskFunction}
 */
export function useBuildScripts(options = {}) {
    return async () => {
        const babel = (await import('@babel/core')).default;
        await finished(gulp.src(options.src || "src/scripts/**/*.jsm", { encoding: false })
            .pipe(new Transform({
                transform(file, encoding, callback) {
                    const output = babel.transform(file.contents.toString("utf-8"), {
                        presets: options.presets ?? [
                            // transpile new syntax into something that r.js can handle
                            "@babel/preset-env"
                        ],
                        plugins: options.plugins ?? [
                            // transform ESM into AMD so that it is RequireJS compatible
                            "@babel/plugin-transform-modules-amd"
                        ],
                        sourceMaps: false
                    });
                    file.extname = ".js"; // force JS extension
                    file.contents = Buffer.from(output.code);
                    callback(null, file);
                },
                objectMode: true
            }))
            .pipe(gulp.dest(options.dest || "dist/js")));
    };
}

/**
 * @typedef {Object} BuildRequireOptions
 * @property {string} base - base directory for module resolution
 * @property {string} src - main file entry point
 * @property {string} dest - target optimized file path
 * @property {string} exclude - list of excluded dependencies
 */

/**
 * Bundle RequireJS application.
 * @param {BuildRequireOptions} [options]
 * @return {TaskFunction}
 */
export function useBuildRequire(options = {}) {
    return () => import("requirejs").then(({ "default": requirejs }) => {
        return new Promise((resolve, reject) => {
            requirejs.optimize({
                baseUrl: options.base || "dist",
                mainConfigFile: options.src || "src/scripts/main.js",
                out: options.dest || "dist/main.js",
                include: ["main"],
                preserveLicenseComments: false,
                generateSourceMaps: true,
                optimize: "uglify2",
                excludeShallow: options.exclude || []
            }, resolve, reject);
        });
    });
}

/**
 * @typedef {Object} BuildModuleOptions
 * @property {string} id - module identifier
 * @property {string} src - main file entry point
 * @property {string} dest - target module file path
 * @property {boolean} [minify] - minify output
 * @property {boolean} [transpile] - transpile output
 * @property {import("rollup").ExternalOption} [external] - external dependencies
 * @property {import("@rollup/plugin-alias").RollupAliasOptions} [alias] - alias options
 */

/**
 * Bundle single input ESM script as AMD module.
 * @param {BuildModuleOptions} options
 * @returns {TaskFunction}
 */
export function useBuildModule(options) {
    return async () => {
        const { rollup } = await import("rollup");
        const plugins = [
            (await import("@rollup/plugin-node-resolve")).nodeResolve()
        ];
        // FIXME create dedicated module bundler for requirejs optimizer?
        if (options.transpile) {
            plugins.push((await import("@rollup/plugin-babel")).babel({
                babelHelpers: 'bundled', // XXX this is not ideal
                presets: ["@babel/preset-env"]
            }));
        }
        if (options.minify) {
            plugins.push((await import("@rollup/plugin-terser")).default());
        }
        if (options.alias) {
            plugins.push((await import("@rollup/plugin-alias")).default(options.alias));
        }
        const bundle = await rollup({
            input: options.src,
            external: options.external,
            plugins
        });
        await bundle.write({
            format: "amd",
            amd: {
                id: options.id
            },
            file: options.dest
        });
    };
}
