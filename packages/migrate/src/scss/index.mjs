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
 * Copyright 2026 Wren Security.
 */
import { dirname, join, relative, sep } from "node:path";
import postcssLess from "postcss-less";
import { applyEdits } from "../edits.mjs";
import { COMMONS_VARIABLES, SCREEN_VARIABLES, convertInterpolation, convertValue, splitArguments } from "./value.mjs";

/**
 * The scss command: converts product Less to SCSS modules on top of the commons modules (see UPGRADE.md).
 */

export const EXTENSIONS = [".less"];

/** Imports of the commons Less entry points and their Sass modules (null removes the import). */
const COMMONS_IMPORTS = {
    "common/forgerock-variables": null,
    "common/structure": "common/structure",
    "common/theme": "common/theme",
    "common/structure/backgrid": "common/structure/backgrid",
    "common/structure/notification": "common/structure/notification",
    "common/list": "common/list"
};

/** Imports of libraries removed in 24.0. */
const REMOVED_IMPORTS = {
    "titatoggle.css": "titatoggle was removed, use Bootstrap 5 switches (form-check form-switch)",
    "bootstrap-dialog.css": "bootstrap-dialog was removed, its styles are part of the commons structure",
    "fontawesome/css/font-awesome.css": "Font Awesome is part of the commons structure",
    "fontawesome/css/font-awesome.min.css": "Font Awesome is part of the commons structure",
    "fontawesome/less/variables.less": "Font Awesome Less variables were removed, use the common/fontawesome module "
        + "(fontawesome.$var-*)"
};

/** Mixins of the former common/helpers.less that were removed. */
const REMOVED_MIXINS = /^(arrow-.*|multi-column-layout|nocache-background-image)$/;

/** Order of generated @use rules. */
const USE_ORDER = ["sass:color", "sass:map", "sass:meta", "common/variables", "common/mixins", "common/helpers"];

const unquote = (text) => text.trim().replace(/^(["'])(.*)\1$/, "$2");

/** Range of the lines of a node (from the line start when only whitespace precedes it, with the line break). */
function lineRange(source, start, end) {
    const lineStart = source.lastIndexOf("\n", start - 1) + 1;
    const before = source.slice(lineStart, start);
    const after = /^[ \t]*(\/\/[^\n]*)?\r?\n?/.exec(source.slice(end));
    if (/^[ \t]*$/.test(before) && !after[1]) {
        return { start: lineStart, end: end + after[0].length };
    }
    return { start, end };
}

/** Declared variables of a parsed Less file: top-level ones (shared with other files) and all of them. */
function declaredVariables(root) {
    const global = new Set();
    const all = new Set();
    root.walk((node) => {
        if (node.type === "atrule" && node.variable) {
            all.add(node.name);
            if (node.parent.type === "root") {
                global.add(node.name);
            }
        } else if (node.type === "rule" && /^[.#][\w-]+\s*\(/.test(node.selector)) {
            for (const match of node.selector.matchAll(/@([\w-]+)/g)) {
                all.add(match[1]);
            }
        }
    });
    return { global, all };
}

/** Whether a parsed file has statements other than variables and imports (it outputs CSS). */
function hasStyles(root) {
    return root.nodes.some((node) => node.type !== "comment" && !(node.type === "atrule" && (node.variable || node.import)));
}

/** Module URL of a product file used by another one (relative, without extension). */
function moduleUrl(from, to) {
    let url = relative(dirname(from), to).split(sep).join("/").replace(/\.(less|scss)$/, "");
    if (!url.startsWith(".")) {
        url = `./${url}`;
    }
    return url.replace(/^\.\/(?=[^.])/, "");
}

/**
 * Convert one parsed Less file.
 */
function convertFile(file, project) {
    const { source, root } = file;
    const edits = [];
    const reports = [];
    const uses = new Set();
    const used = new Map();
    let reportOffset = 0;
    const context = {
        uses,
        use: (name) => used.has(name) || used.set(name, reportOffset),
        report: (rule, message) => reports.push({ offset: reportOffset, rule, message, text: "" })
    };
    const report = (offset, rule, message, text = "") => reports.push({ offset, rule, message, text });
    const replace = (start, end, text) => edits.push({ start, end, text });
    const statements = { useNodes: [], cssImports: [], firstStyle: null };
    const useEdits = [];
    const addUse = (start, end, url) => {
        const edit = { start, end, text: `@use "${url}";`, url };
        edits.push(edit);
        useEdits.push(edit);
    };
    let commonEntry = null;

    for (const node of root.nodes) {
        if (!(node.type === "comment" || (node.type === "atrule" && (node.import || node.variable)))) {
            statements.firstStyle ??= node;
        }
    }

    function convertMixinCall(node, text, start, end) {
        const name = node.name;
        const args = node.params.replace(/^\(([\s\S]*)\)$/, "$1");
        const argumentList = args.trim() ? splitArguments(args) : [];
        const tail = /\s*;\s*$/.test(text) || node.raws.semicolon !== false ? ";" : "";
        if (node.important) {
            report(start, "less-mixin", "!important after a mixin call has no Sass equivalent", text);
        }
        if (node.raws.identifier === "." && name === "fa-icon" && !argumentList.length) {
            uses.add("common/mixins");
            replace(start, end, `@include mixins.fa-icon${tail}`);
        } else if (node.raws.identifier === "." && name === "icon-circle") {
            uses.add("common/mixins");
            const converted = argumentList.map((arg) => convertValue(arg, context, true));
            replace(start, end, `@include mixins.icon-circle${converted.length ? `(${converted.join(", ")})` : ""}${tail}`);
        } else if (node.raws.identifier === "." && name === "transition") {
            const value = argumentList.map((arg) => convertValue(arg, context)).join(" ");
            replace(start, end, `transition: ${value}${tail}`);
        } else if (node.raws.identifier === "." && name === "ellipsis" && !argumentList.length) {
            uses.add("common/helpers");
            replace(start, end, `@extend .ellipsis${tail}`);
        } else if (REMOVED_MIXINS.test(name)) {
            report(start, "removed-mixin", `.${name}() was removed from commons, inline its declarations`, text);
        } else {
            report(start, "less-mixin", project.mixins.has(name)
                ? `call of the product mixin .${name}, use @include with a @mixin definition, or @extend`
                : `call of .${name}, use @extend .${name} (or @include with a @mixin definition)`, text);
            const converted = convertValue(args, context, true);
            if (converted !== args) {
                const argsStart = text.indexOf(args);
                replace(start + argsStart, start + argsStart + args.length, converted);
            }
        }
    }

    root.walk((node) => {
        const start = node.source.start.offset;
        const end = node.source.end.offset;
        const text = source.slice(start, end);
        reportOffset = start;

        if (node.type === "atrule" && node.import) {
            const options = (node.options ?? "").replace(/[()\s]/g, "");
            const url = unquote(node.filename ?? node.params);
            const nested = node.parent.type !== "root";
            const base = url.replace(/\.less$/, "");
            if (/^url\(|\s/.test(node.filename ?? "") || ["reference", "inline", "multiple", "optional"].includes(options)) {
                report(start, "less-import", `@import (${options}) has no Sass equivalent, rewrite the import`, text);
            } else if (REMOVED_IMPORTS[url]) {
                const range = lineRange(source, start, end);
                replace(range.start, range.end, "");
                report(start, "removed-import", REMOVED_IMPORTS[url], text);
            } else if (base in COMMONS_IMPORTS) {
                const module = COMMONS_IMPORTS[base];
                if (!module || (commonEntry && ["common/structure", "common/theme"].includes(module))) {
                    const range = lineRange(source, start, end);
                    replace(range.start, range.end, "");
                } else {
                    const both = ["common/structure", "common/theme"].includes(module)
                        && ["common/structure", "common/theme"].every((other) => root.nodes.some((sibling) =>
                            sibling.import && unquote(sibling.filename ?? "").replace(/\.less$/, "") === other));
                    commonEntry ??= both ? module : null;
                    addUse(start, end, both ? "common/common" : module);
                    statements.useNodes.push(node);
                }
            } else if (/\.css$/.test(url) || options === "css") {
                if (nested) {
                    report(start, "less-import", "nested CSS imports have no Sass equivalent, move the import", text);
                } else {
                    statements.cssImports.push({ node, text: `@import "${url}";` });
                }
            } else if (nested) {
                uses.add("sass:meta");
                replace(start, end, `@include meta.load-css("${base}");`);
            } else {
                addUse(start, end, base);
                statements.useNodes.push(node);
            }
        } else if (node.type === "atrule" && node.variable) {
            const match = /^@([\w-]+)(\s*:\s*)([\s\S]*?)(\s*;?)$/.exec(text);
            if (node.nodes || !match) {
                report(start, "less-feature", "detached rulesets have no Sass equivalent, use a mixin", text);
                return;
            }
            const sass = project.colorArguments.has(match[1]);
            if (sass && Array.from(match[3].matchAll(/@([\w-]+)/g)).some((name) => COMMONS_VARIABLES.has(name[1]))) {
                report(start, "build-time-color", `$${match[1]} is an argument of color functions, so it takes the commons `
                    + "Sass variable (resolved at build time, not changed by --wrensec-* properties)", text);
            }
            if (COMMONS_VARIABLES.has(match[1])) {
                report(start, "commons-variable", `@${match[1]} is a commons variable, configure it with `
                    + `@use "common/variables" with ($${match[1]}: …) in the first stylesheet that loads commons, `
                    + `or set --wrensec-${match[1]}`, text);
            }
            replace(start, end, `$${match[1]}${match[2]}${convertValue(match[3], context, sass)}${match[4]}`);
        } else if (node.type === "atrule" && node.mixin) {
            convertMixinCall(node, text, start, end);
        } else if (node.type === "atrule") {
            const params = node.raws.params?.raw ?? node.params;
            const headerStart = start + 1 + node.name.length + (node.raws.afterName ?? "").length;
            if (!params || source.slice(headerStart, headerStart + params.length) !== params) {
                return;
            }
            if (["plugin", "arguments", "rest"].includes(node.name)) {
                report(start, "less-feature", `@${node.name} has no Sass equivalent`, text);
                return;
            }
            const media = node.name === "media"
                && /^\(\s*(min|max)-width\s*:\s*@(screen-(?:xs|sm|md|lg))\s*\)$/.exec(params.trim());
            if (media) {
                uses.add("common/mixins");
                const mixin = media[1] === "min" ? "media-up" : "media-max";
                replace(start, headerStart + params.length, `@include mixins.${mixin}(${SCREEN_VARIABLES[media[2]]})`);
            } else {
                const converted = convertValue(params, context);
                if (converted !== params) {
                    replace(headerStart, headerStart + params.length, converted);
                }
            }
        } else if (node.type === "rule") {
            const selector = node.raws.selector?.raw ?? node.selector;
            if (source.slice(start, start + selector.length) !== selector) {
                return;
            }
            if (/^[.#][\w-]+\s*\(/.test(selector) || /\swhen\s/.test(selector)) {
                report(start, /\swhen\s/.test(selector) ? "less-guard" : "less-mixin",
                    /\swhen\s/.test(selector) ? "guards have no Sass equivalent, use @if"
                        : "mixin definition, convert it to @mixin and its calls to @include", selector);
                const converted = selector.replace(/@([\w-]+)/g, "$$$1");
                if (converted !== selector) {
                    replace(start, start + selector.length, converted);
                }
                return;
            }
            if (/:extend\(/.test(selector)) {
                report(start, "less-extend", ":extend() in selectors has no Sass equivalent, use @extend in the rule", selector);
            }
            const converted = convertInterpolation(selector, context);
            if (converted !== selector) {
                replace(start, start + selector.length, converted);
            }
        } else if (node.type === "decl") {
            if (node.extend) {
                const extend = /extend\((.*)\)/.exec(node.value);
                const targets = extend ? splitArguments(extend[1]) : [];
                if (targets.some((target) => /\sall$/.test(target)) || !targets.length) {
                    report(start, "less-extend", "&:extend(… all) has no Sass equivalent, use @extend", text);
                } else {
                    replace(start, end, targets.map((target) => `@extend ${target};`).join(" "));
                }
                return;
            }
            const converted = convertValue(text, context);
            if (converted !== text) {
                replace(start, end, converted);
            }
        }
    });

    // Product variables declared in other files are used from their modules
    for (const [name, offset] of used) {
        if (file.variables.all.has(name)) {
            continue;
        }
        const declaring = project.files.filter((other) => other !== file && other.variables.global.has(name));
        if (declaring.length === 1) {
            file.modules.set(declaring[0], Math.min(offset, file.modules.get(declaring[0]) ?? offset));
        } else if (declaring.length > 1) {
            report(offset, "variable-module", `$${name} is declared in ${declaring.length} files, @use the one it comes from`);
        } else {
            report(offset, "less-variable", `@${name} is not declared by the product (Bootstrap 3 or Font Awesome 4 `
                + "variable?), use a Bootstrap 5 Sass variable, a --bs-* property or the common/fontawesome module");
        }
    }
    const productUses = [];
    for (const [other, offset] of file.modules) {
        const url = moduleUrl(file.path, other.path);
        const existing = useEdits.find((edit) => !edit.url.startsWith("common/")
            && join(dirname(file.path), `${edit.url}.less`) === other.path);
        if (existing) {
            existing.text = `@use "${existing.url}" as *;`;
            existing.star = true;
            continue;
        }
        if (hasStyles(other.root)) {
            report(offset, "variable-module", `${url} is used for its variables, its styles are now output where it is `
                + "first used, move the variables to a separate module if the order matters");
        }
        productUses.push(`@use "${url}" as *;`);
    }

    // @use rules come before other rules: move CSS imports after them and add the modules the file needs
    const useLines = [...USE_ORDER.filter((module) => uses.has(module)).map((module) => `@use "${module}";`), ...productUses];
    const lastUse = statements.useNodes.at(-1);
    const misplacedUses = statements.useNodes.filter((node) => statements.firstStyle
        && node.source.start.offset > statements.firstStyle.source.start.offset);
    for (const node of misplacedUses) {
        report(node.source.start.offset, "use-order", "@use moved before the styles (Sass loads modules first)");
    }
    const movedCss = statements.cssImports.filter((entry) => lastUse
        && entry.node.source.start.offset < lastUse.source.end.offset);
    // Product modules are used for their styles only, so a module whose namespace is taken gets an alias
    const namespaces = new Set(USE_ORDER.filter((module) => uses.has(module)).map((module) => module.split(/[:/]/).at(-1)));
    for (const edit of useEdits.filter((item) => !item.star)) {
        const segments = edit.url.split("/").map((segment) => segment.replace(/^_/, ""));
        if (namespaces.has(segments.at(-1)) && !edit.url.startsWith("common/")) {
            const alias = segments.slice(-2).join("-").replace(/[^\w-]/g, "");
            edit.text = `@use "${edit.url}" as ${alias};`;
            namespaces.add(alias);
        } else {
            namespaces.add(segments.at(-1));
        }
    }

    // Generated and misplaced @use rules go before the first statement (variables may refer to the modules)
    const first = root.nodes.find((node) => node.type !== "comment" && !(node.import && !statements.useNodes.includes(node)));
    const insertAt = first ? lineRange(source, first.source.start.offset, first.source.start.offset).start : source.length;
    const header = [...useLines];
    for (const node of misplacedUses) {
        const range = lineRange(source, node.source.start.offset, node.source.end.offset);
        const edit = useEdits.find((item) => item.start === node.source.start.offset);
        header.push(edit.text);
        Object.assign(edit, range, { text: "" });
    }
    const headerCss = misplacedUses.includes(lastUse) ? movedCss : [];
    if (headerCss.length) {
        header.push("", ...headerCss.map((entry) => entry.text));
    }
    if (header.length) {
        const blank = first && statements.useNodes.includes(first) && !misplacedUses.includes(first) ? "" : "\n";
        edits.push({ start: insertAt, end: insertAt, text: `${header.join("\n")}\n${blank}` });
    }
    for (const entry of movedCss) {
        const range = lineRange(source, entry.node.source.start.offset, entry.node.source.end.offset);
        replace(range.start, range.end, "");
    }
    if (movedCss.length && !headerCss.length) {
        const lastEnd = lineRange(source, lastUse.source.start.offset, lastUse.source.end.offset).end;
        edits.push({ start: lastEnd, end: lastEnd, text: `\n${movedCss.map((entry) => entry.text).join("\n")}\n` });
    }
    for (const entry of statements.cssImports.filter((item) => !movedCss.includes(item))) {
        if (entry.node.source.end.offset - entry.node.source.start.offset !== entry.text.length
                || source.slice(entry.node.source.start.offset, entry.node.source.end.offset) !== entry.text) {
            replace(entry.node.source.start.offset, entry.node.source.end.offset, entry.text);
        }
    }

    // Removed imports leave runs of blank lines, keep one (unless the file had such runs already)
    const output = applyEdits(source, edits);
    const blankRuns = /\n(?:[ \t]*\r?\n){2,}/g;
    return { output: blankRuns.test(source) ? output : output.replace(blankRuns, "\n\n"), reports };
}

/**
 * Convert Less files of a product to SCSS.
 *
 * @param {{ path: string, source: string }[]} inputs Less files (converted together, so that variables declared in
 *        one file and used in another are found)
 * @returns {{ path: string, output: string, reports: object[] }[]} SCSS files (the new path, content and reports)
 */
export function convertLess(inputs) {
    const files = [];
    const results = [];
    for (const input of inputs) {
        try {
            const root = postcssLess.parse(input.source);
            files.push({ ...input, root, variables: declaredVariables(root), modules: new Map() });
        } catch (error) {
            results.push({ path: input.path, output: null, reports: [{ offset: error.input?.offset ?? 0, rule: "parse-error",
                text: "", message: `the file can't be parsed (${error.reason ?? error.message}), convert it by hand` }] });
        }
    }
    const mixins = new Set();
    for (const file of files) {
        file.root.walkRules((rule) => {
            const match = /^[.#]([\w-]+)\s*\(/.exec(rule.selector);
            if (match) {
                mixins.add(match[1]);
            }
        });
    }
    // Variables passed to color functions need Sass values (commons Sass variables instead of custom properties)
    const colorArguments = new Set();
    const colorFunction = /\b(?:darken|lighten|saturate|desaturate|fadein|fadeout|fade|spin|mix)\(([^;{}]*)/gi;
    for (const file of files) {
        for (const call of file.source.matchAll(colorFunction)) {
            for (const variable of call[1].matchAll(/@([\w-]+)/g)) {
                colorArguments.add(variable[1]);
            }
        }
    }
    const project = { files, mixins, colorArguments };
    for (const file of files) {
        results.push({ path: file.path, ...convertFile(file, project) });
    }
    return results;
}

/** Path of the SCSS file converted from a Less file. */
export function scssPath(path) {
    return path.replace(/\.less$/i, ".scss");
}
