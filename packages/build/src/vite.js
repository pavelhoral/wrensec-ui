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
 * Copyright 2025 Wren Security.
 */
import { createFilter } from "@rollup/pluginutils";
import MagicString from "magic-string";
import { dirname, isAbsolute, join, normalize } from 'node:path';

/**
 * @typedef {import("@rollup/pluginutils").FilterPattern} FilterPattern
 */

/**
 * @typedef {Object} CustomPreambleOptions
 * @property {string} content - content to insert at the beginning of the file
 * @property {FilterPattern} [include] - pattern to include files
 * @property {FilterPattern} [exclude] - pattern to exclude files
 */

/**
 * Insert custom content into the beginning of the processed file.
 * @param {CustomPreambleOptions} options - plugin options
 * @returns {import("rollup").Plugin} rollup plugin
 */
export function customPreamble(options = {}) {
    const filter = createFilter(options.include, options.exclude);
    return {
        name: "custom-preamble",
        transform(code, id) {
            if (!filter(id)) {
                return null;
            }
            const magicString = new MagicString(code)
                .prepend(options.content + "\n");
            return {
                code: magicString.toString(),
                map: magicString.generateMap({ hires: true })
            };
        }
    };
}

/**
 * @typedef {Object} LegacyResolveOptions
 * @property {string} [root] - root directory for the resolved files
 * @property {FilterPattern} [include] - pattern to include files
 * @property {FilterPattern} [exclude] - pattern to exclude files
 */

/**
 * Resolve local dependencies defined using non-relative module ids.
 * @param {LegacyResolveOptions} options  - plugin options
 * @returns {import("rollup").Plugin} rollup plugin
 */
export function legacyResolve(options) {
    const filter = createFilter(options.include, options.exclude);
    let { root } = options;
    return {
        name: "resolve-local",
        buildStart(rollupOptions) {
            if (root === undefined) {
                root = dirname(rollupOptions.input[0]);
            }
        },
        async resolveId(source) {
            if (!filter(source)) {
                return null;
            }
            const candidate = source.endsWith(".js") ? source : `${source}.js`;
            if (candidate.startsWith('.')) {
              return normalize(join(root, candidate));
            }
            return isAbsolute(candidate) ? candidate : join(root, candidate);
        }
    };
}

/**
 * @typedef {Object} IndexReplaceOptions
 * @param {Record<string, string>} replace - string replacement values
 */

/**
 * Replace string in the index.html file.
 * @param {IndexReplaceOptions} options - plugin options
 * @returns {import("vite").Plugin} rollup plugin
 */
export function indexReplace(options) {
    return {
        name: 'index-replace',
        transformIndexHtml(html) {
            return Object.entries(options.replace).reduce((result, [key, value]) => {
                return result.replaceAll(key, value);
            }, html);
        }
    };
}
