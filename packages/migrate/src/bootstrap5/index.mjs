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
import { extname } from "node:path";
import postcss from "postcss";
import postcssLess from "postcss-less";
import postcssScss from "postcss-scss";
import { applyEdits } from "../edits.mjs";
import { Segment, tokenize } from "../text.mjs";
import { hasBootstrap5Attributes, migrateAttributes } from "./attributes.mjs";
import { FileContext, gridGuardReport, isBootstrap3Class, migrateClasses } from "./classes.mjs";
import { markupUsage, migrateMarkup, scanMarkup } from "./markup.mjs";
import { collectScriptSites } from "./script.mjs";
import { migrateSelector, parseSelector, selectorUsage } from "./selector.mjs";

/**
 * The bootstrap5 command: renames Bootstrap 3 classes and data attributes in templates, scripts and styles.
 */

export const TEMPLATE_EXTENSIONS = [".html", ".hbs", ".handlebars"];
export const SCRIPT_EXTENSIONS = [".js", ".mjs", ".cjs", ".jsm", ".jsx"];
export const STYLE_EXTENSIONS = [".scss", ".less", ".css"];
export const EXTENSIONS = [...TEMPLATE_EXTENSIONS, ...SCRIPT_EXTENSIONS, ...STYLE_EXTENSIONS];

/** Selector sites of a stylesheet. */
function collectStyleSites(source, extension) {
    const syntax = { ".scss": postcssScss, ".less": postcssLess }[extension];
    let root;
    try {
        root = syntax ? syntax.parse(source) : postcss.parse(source);
    } catch (error) {
        return { error };
    }
    const sites = [];
    const reports = [];
    root.walk((node) => {
        let text;
        let start;
        if (node.type === "rule" && !node.mixin) {
            text = node.raws.selector?.raw ?? node.selector;
            start = node.source.start.offset;
        } else if (node.type === "atrule" && node.name === "extend") {
            text = node.params;
            start = source.indexOf(text, node.source.start.offset + "@extend".length);
        } else {
            return;
        }
        if (start === -1 || source.slice(start, start + text.length) !== text) {
            return;
        }
        if (/[#@]\{|\(/.test(text) && !/:[\w-]+\(/.test(text)) {
            if (tokenize(text.replace(/[.,>+~]/g, " ")).some((token) => isBootstrap3Class(token.text))) {
                reports.push({ offset: start, rule: "dynamic-selector", text,
                    message: "selector with interpolation or mixin parameters, rename the Bootstrap 3 classes by hand" });
            }
            return;
        }
        sites.push({ kind: "selector", segment: Segment.plain(text, start) });
    });
    return { sites, edits: [], reports };
}

/** Prepare sites: parse them and collect the classes and attributes they use. */
function prepare(site) {
    if (site.kind === "markup") {
        site.elements = scanMarkup(site.segment.text);
        return markupUsage(site.elements);
    }
    if (site.kind === "selector") {
        site.root = parseSelector(site.segment.text);
        return site.root ? selectorUsage(site.root) : { classes: new Set(), attributes: [] };
    }
    if (site.kind === "classes") {
        site.tokens = tokenize(site.segment.text);
        return { classes: new Set(site.tokens.map((token) => token.text)), attributes: [] };
    }
    return { classes: new Set(), attributes: site.attributes.map((attribute) => attribute.name) };
}

/** Edits of a class list site (jQuery class methods, className). */
function migrateClassList(site, file) {
    const { tokens, mode } = site;
    const edits = [];
    const reports = [];
    const { result, reports: classReports } = migrateClasses(tokens.map((token) => token.text),
        { file, mode, tag: site.tag });
    let consumedUntil = 0;
    result.forEach((renamed, index) => {
        const token = tokens[index];
        if (!renamed) {
            return;
        }
        if (mode === "has" && renamed.length !== 1) {
            reports.push({ offset: token.start, rule: "has-class", text: token.text,
                message: `Bootstrap 5 replaces the class with "${renamed.join(" ")}", rewrite the test by hand` });
        } else if (renamed.length) {
            edits.push({ start: token.start, end: token.end, text: renamed.join(" ") });
        } else {
            const text = site.segment.text;
            let start = token.start;
            let end = token.end;
            if (start > consumedUntil && /\s/.test(text[start - 1] ?? "")) {
                while (start > consumedUntil && /\s/.test(text[start - 1])) {
                    start--;
                }
            } else {
                while (/\s/.test(text[end] ?? "")) {
                    end++;
                }
            }
            consumedUntil = end;
            edits.push({ start, end, text: "" });
        }
    });
    const guard = gridGuardReport(tokens.map((token) => token.text), file);
    for (const report of guard ? [...classReports, guard] : classReports) {
        reports.push({ offset: tokens[report.index].start, rule: report.rule, text: tokens[report.index].text,
            message: report.message });
    }
    return { edits, reports };
}

/** Edits of JSX data attributes. */
function migrateJsxAttributes(site) {
    const edits = [];
    const reports = [];
    const { result, reports: attributeReports } = migrateAttributes(site.attributes);
    result.forEach((name, index) => {
        const node = site.attributes[index].node.name;
        if (name) {
            edits.push({ start: node.start, end: node.end, text: name });
        }
    });
    for (const report of attributeReports) {
        const node = site.attributes[report.index].node;
        reports.push({ offset: node.start, rule: report.rule, text: site.attributes[report.index].name, message: report.message });
    }
    return { edits, reports };
}

/** Keep one grid guard report per file. */
function dedupeGridGuard(reports) {
    let guarded = false;
    return reports.filter((report) => report.rule !== "grid-guard" || (!guarded && (guarded = true)));
}

/**
 * Migrate one source file.
 *
 * @param {string} path file path (its extension selects the file type)
 * @param {string} source file content
 * @returns {{ output: string, reports: object[] }} migrated content and reports with source offsets
 */
export function migrateBootstrap5(path, source) {
    const extension = extname(path).toLowerCase();
    if (/\.min\.[^.]+$/i.test(path)) {
        return { output: source, reports: /Bootstrap v3|\.col-xs-\d/.test(source) ? [{ offset: 0, rule: "bootstrap3-build",
            text: "", message: "minified Bootstrap 3 build (e.g. of a custom theme), replace it with a Bootstrap 5 build "
                + "(see UPGRADE.md, custom themes)" }] : [] };
    }
    let collected;
    if (TEMPLATE_EXTENSIONS.includes(extension)) {
        collected = { sites: [{ kind: "markup", segment: Segment.plain(source, 0) }], edits: [], reports: [] };
    } else if (SCRIPT_EXTENSIONS.includes(extension)) {
        collected = collectScriptSites(source, { jsx: extension === ".jsx" });
    } else {
        collected = collectStyleSites(source, extension);
    }
    if (collected.error) {
        return { output: source, reports: [{ offset: collected.error.pos ?? 0, rule: "parse-error", text: "",
            message: `the file can't be parsed (${collected.error.message}), migrate it by hand` }] };
    }

    const classes = new Set();
    const attributes = [];
    for (const site of collected.sites) {
        const usage = prepare(site);
        usage.classes.forEach((token) => classes.add(token));
        attributes.push(...usage.attributes);
    }
    const file = new FileContext(classes, hasBootstrap5Attributes(attributes));

    const edits = [...collected.edits];
    const reports = [...collected.reports];
    for (const site of collected.sites) {
        let result;
        if (site.kind === "markup") {
            result = migrateMarkup(site.segment.text, site.elements, file);
        } else if (site.kind === "selector") {
            result = site.root ? migrateSelector(site.segment.text, site.root, file) : { edits: [], reports: [] };
        } else if (site.kind === "classes") {
            result = migrateClassList(site, file);
        } else {
            result = migrateJsxAttributes(site);
            edits.push(...result.edits);
            reports.push(...result.reports);
            continue;
        }
        edits.push(...result.edits.map((edit) => site.segment.toSource(edit)));
        reports.push(...result.reports.map((report) => ({ ...report, offset: site.segment.offset(report.offset) })));
    }

    return { output: applyEdits(source, edits), reports: dedupeGridGuard(reports) };
}
