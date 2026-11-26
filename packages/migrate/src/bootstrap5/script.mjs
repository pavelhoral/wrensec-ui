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
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import { decodeJsString, Segment, tokenize } from "../text.mjs";
import { isBootstrap3Class, isBootstrap3Prefix } from "./classes.mjs";

const traverse = traverseModule.default ?? traverseModule;

/**
 * Collection of class lists, selectors and HTML fragments in scripts (with their call context), and reports of
 * Bootstrap 3 plugin and jQuery 3 APIs.
 */

/** jQuery methods taking a class list, with the class list mode. */
const CLASS_METHODS = { addClass: "add", removeClass: "remove", toggleClass: "add", hasClass: "has" };

/** jQuery and DOM methods taking a selector as the first argument. */
const SELECTOR_METHODS = new Set(["find", "closest", "is", "filter", "not", "children", "parents", "parent",
    "siblings", "next", "prev", "nextAll", "prevAll", "nextUntil", "prevUntil", "parentsUntil", "has",
    "querySelector", "querySelectorAll", "matches", "delegate", "undelegate"]);

/** jQuery event methods taking a selector as the second argument. */
const EVENT_METHODS = new Set(["on", "off", "one"]);

/** jQuery utilities removed in jQuery 4 and their native replacements. */
const JQUERY_REMOVED = {
    trim: "s.trim()",
    isArray: "Array.isArray(a)",
    parseJSON: "JSON.parse(s)",
    isFunction: "typeof f === \"function\"",
    now: "Date.now()",
    type: "typeof or Object.prototype.toString",
    isNumeric: "Number.isFinite() or a regular expression",
    isWindow: "obj != null && obj === obj.window",
    camelCase: "a string replacement",
    nodeName: "element.nodeName.toLowerCase()",
    unique: "$.uniqueSort()",
    proxy: "Function.prototype.bind() (deprecated)",
    holdReady: "no replacement"
};

const REMOVED_MODULE = /^(?:libs\/)?(bootstrap-dialog|titatoggle|font-awesome)(?:\.min)?(?:\.js)?$/;

const literalValue = (node) => node?.type === "StringLiteral" ? node.value
    : node?.type === "TemplateLiteral" && !node.expressions.length ? node.quasis[0].value.cooked : null;

/**
 * Collect migration sites of a script.
 *
 * @returns {{ sites: object[], edits: object[], reports: object[] }|null} sites (segments of the source with their
 *          kind), source edits and reports; null when the script can't be parsed
 */
export function collectScriptSites(code, { jsx = false } = {}) {
    let ast;
    try {
        ast = parse(code, {
            sourceType: "unambiguous",
            errorRecovery: true,
            allowReturnOutsideFunction: true,
            allowAwaitOutsideFunction: true,
            allowImportExportEverywhere: true,
            plugins: jsx ? ["jsx"] : []
        });
    } catch (error) {
        if (!jsx) {
            return collectScriptSites(code, { jsx: true });
        }
        return { error };
    }

    const sites = [];
    const edits = [];
    const reports = [];
    const handled = new WeakSet();
    const report = (node, rule, message, text) => reports.push({ offset: node.start, rule, message,
        text: text ?? code.slice(node.start, Math.min(node.end, node.start + 60)) });

    const segmentOf = (node) => {
        if (node.type === "StringLiteral") {
            return decodeJsString(code.slice(node.start + 1, node.end - 1), node.start + 1);
        }
        if (node.type === "TemplateLiteral" && !node.expressions.length) {
            const quasi = node.quasis[0];
            return decodeJsString(code.slice(quasi.start, quasi.end), quasi.start);
        }
        return null;
    };

    /** Leaves of a string concatenation or template literal, null for other expressions. */
    const leavesOf = (node) => {
        if (node.type === "BinaryExpression" && node.operator === "+") {
            return [...(leavesOf(node.left) ?? [node.left]), ...(leavesOf(node.right) ?? [node.right])];
        }
        if (node.type === "TemplateLiteral" && node.expressions.length) {
            return node.quasis.flatMap((quasi, index) => index < node.expressions.length
                ? [quasi, node.expressions[index]] : [quasi]);
        }
        return null;
    };

    /** Segment joining the literal parts of a concatenation, expressions are opaque {{x}} placeholders. */
    const joinedSegment = (leaves) => Segment.join(leaves.map((leaf) => {
        if (leaf.type === "StringLiteral") {
            return decodeJsString(code.slice(leaf.start + 1, leaf.end - 1), leaf.start + 1);
        }
        if (leaf.type === "TemplateElement") {
            return decodeJsString(code.slice(leaf.start, leaf.end), leaf.start);
        }
        return { text: "{{x}}", offset: leaf.start };
    }));

    const literalText = (leaves) => leaves.map((leaf) => leaf.type === "StringLiteral" ? leaf.value
        : leaf.type === "TemplateElement" ? leaf.value.cooked : "{{x}}").join("");

    /**
     * Whether text with {{x}} placeholders mentions Bootstrap 3 classes: class tokens of a class list, or class
     * selectors and Bootstrap data attributes of a selector.
     */
    const mentionsBootstrap3 = (text, kind) => {
        const parts = text.split("{{x}}");
        if (kind === "classes") {
            return parts.some((part) => isBootstrap3Prefix(part) || tokenize(part).some((token) => isBootstrap3Class(token.text)));
        }
        return /\[data-(toggle|target|dismiss)/.test(text) || parts.some((part) => {
            const prefix = /\.([\w-]*)$/.exec(part);
            return (prefix && isBootstrap3Prefix(prefix[1]))
                || Array.from(part.matchAll(/\.([a-zA-Z][\w-]*)/g)).some((match) => isBootstrap3Class(match[1]));
        });
    };

    const isMarkup = (text) => /^\s*<[a-zA-Z!]/.test(text);

    const markLeaves = (leaves) => leaves.forEach((leaf) => handled.add(leaf));

    /**
     * Add a site for an argument of a known kind ("classes", "selector" or "selector-or-markup").
     */
    const addSite = (node, kind, mode) => {
        if (!node) {
            return;
        }
        const segment = segmentOf(node);
        if (segment) {
            handled.add(node);
            if (kind === "selector-or-markup") {
                sites.push({ kind: isMarkup(segment.text) ? "markup" : "selector", segment });
            } else {
                sites.push({ kind, segment, mode });
            }
            return;
        }
        const leaves = leavesOf(node);
        if (!leaves) {
            return;
        }
        handled.add(node);
        markLeaves(leaves);
        const first = leaves[0];
        if (kind === "selector-or-markup" && ["StringLiteral", "TemplateElement"].includes(first.type)
                && isMarkup(first.type === "StringLiteral" ? first.value : first.value.cooked)) {
            sites.push({ kind: "markup", segment: joinedSegment(leaves) });
        } else if (mentionsBootstrap3(literalText(leaves), kind)) {
            report(node, "concatenated", kind === "classes"
                ? "class list built by concatenation, rename the Bootstrap 3 classes by hand"
                : "selector built by concatenation, rename the Bootstrap 3 classes and attributes by hand");
        }
    };

    const checkString = (node, value, concatenated) => {
        if (/\bloaded\.bs\.modal\b/.test(value)) {
            report(node, "plugin-api", "loaded.bs.modal was removed with the modal remote option");
        }
        if (/\b(show|shown|hide|hidden)\.bs\.dropdown\b/.test(value)) {
            report(node, "plugin-api", "Bootstrap 5 triggers dropdown events on the toggle, not on its parent");
        }
        if (value === "data-original-title") {
            report(node, "plugin-api", "data-bs-original-title is internal to Bootstrap 5, use title");
        }
        if (REMOVED_MODULE.test(value)) {
            report(node, "removed-library", "the library was removed, see UPGRADE.md (RequireJS paths and shims)");
        }
        const tokens = tokenize(value).map((token) => token.text);
        if (concatenated && (tokens.some(isBootstrap3Class) || isBootstrap3Prefix(value))) {
            report(node, "concatenated", "string with Bootstrap 3 classes built by concatenation, rename them by hand");
        } else if (!concatenated && tokens.length && tokens.every((token) => /^[a-z][a-z0-9-]*$/.test(token))
                && tokens.some((token) => token.includes("-") && isBootstrap3Class(token))) {
            report(node, "class-string", "string with Bootstrap 3 classes in an unknown context, rename them if they are classes");
        }
    };

    traverse(ast, {
        CallExpression(path) {
            const { callee, arguments: args } = path.node;
            const method = callee.type === "MemberExpression" && !callee.computed && callee.property.type === "Identifier"
                ? callee.property.name : null;
            const isDollar = (callee.type === "Identifier" && ["$", "jQuery"].includes(callee.name)) || method === "$";
            if (CLASS_METHODS[method]) {
                if (method === "toggleClass" && args.length === 1 && args[0].type === "BooleanLiteral") {
                    report(path.node, "jquery4", ".toggleClass(boolean) was removed in jQuery 4");
                }
                addSite(args[0], "classes", CLASS_METHODS[method]);
            } else if (isDollar || SELECTOR_METHODS.has(method)) {
                addSite(args[0], isDollar ? "selector-or-markup" : "selector");
            } else if (EVENT_METHODS.has(method) && args.length > 2) {
                addSite(args[1], "selector");
            } else if (method === "attr" && literalValue(args[0]) === "class") {
                addSite(args[1], "classes", "markup");
            }

            if (method === "button" && literalValue(args[0]) && literalValue(args[0]) !== "toggle") {
                report(path.node, "plugin-api", "the Bootstrap 5 button plugin only toggles, set the state and text by hand");
            } else if (method === "affix") {
                report(path.node, "affix", "position: sticky (sticky-top)");
            } else if (method === "modal" && args[0]?.type === "ObjectExpression"
                    && args[0].properties.some((property) => property.key?.name === "remote" || property.key?.value === "remote")) {
                report(path.node, "plugin-api", "the modal remote option was removed, load the content with JavaScript");
            } else if (method === "size" && !args.length && callee.object.type === "CallExpression"
                    && ((callee.object.callee.type === "Identifier" && ["$", "jQuery"].includes(callee.object.callee.name))
                        || callee.object.callee.property?.name === "$")) {
                report(path.node, "jquery4", ".size() was removed in jQuery 4, use .length");
            }
        },

        MemberExpression(path) {
            const { object, property, computed } = path.node;
            if (computed || property.type !== "Identifier") {
                return;
            }
            if (object.type === "Identifier" && ["$", "jQuery"].includes(object.name) && JQUERY_REMOVED[property.name]) {
                report(path.node, "jquery4", `$.${property.name}() was removed in jQuery 4, use ${JQUERY_REMOVED[property.name]}`);
            } else if (property.name === "whiteList") {
                report(path.node, "plugin-api", "whiteList is allowList in Bootstrap 5 (Constructor.Default.allowList)");
            }
        },

        ObjectProperty(path) {
            const { key, value, computed } = path.node;
            const name = computed ? null : key.type === "Identifier" ? key.name : key.type === "StringLiteral" ? key.value : null;
            if (name === "className" || name === "cssClass") {
                addSite(value, "classes", "markup");
            } else if (name === "whiteList") {
                handled.add(key);
                const start = key.type === "StringLiteral" ? key.start + 1 : key.start;
                edits.push({ start, end: start + "whiteList".length, text: "allowList" });
            } else if (name === "events" && value.type === "ObjectExpression") {
                for (const event of value.properties) {
                    const segment = event.type === "ObjectProperty" && !event.computed ? segmentOf(event.key) : null;
                    const match = segment && /^\s*\S+\s+/.exec(segment.text);
                    if (match) {
                        handled.add(event.key);
                        checkString(event.key, match[0].trim(), false);
                        sites.push({ kind: "selector",
                            segment: new Segment(segment.text.slice(match[0].length), segment.map.slice(match[0].length)) });
                    }
                }
            }
        },

        JSXOpeningElement(path) {
            const name = path.node.name.type === "JSXIdentifier" ? path.node.name.name : null;
            const tag = name && /^[a-z]/.test(name) ? name : null;
            const attributes = [];
            for (const attribute of path.node.attributes) {
                if (attribute.type !== "JSXAttribute" || attribute.name.type !== "JSXIdentifier") {
                    continue;
                }
                const value = attribute.value?.type === "JSXExpressionContainer" ? attribute.value.expression : attribute.value;
                if (!tag) {
                    // Components (react-bootstrap) render their own classes, they are migrated with their library
                    const text = literalValue(value);
                    if (value && attribute.name.name === "className" && text !== null
                            && tokenize(text).some((token) => isBootstrap3Class(token.text))) {
                        handled.add(value);
                        report(attribute, "component", "Bootstrap 3 classes of a component, migrate them with the component "
                            + "library (react-bootstrap)");
                    }
                } else if (attribute.name.name === "className" && value) {
                    if (value.type === "StringLiteral" && attribute.value.type === "StringLiteral") {
                        handled.add(value);
                        sites.push({ kind: "classes", mode: "markup", tag,
                            segment: Segment.plain(value.value, value.start + 1) });
                    } else {
                        addSite(value, "classes", "markup");
                    }
                } else if (/^data-/.test(attribute.name.name)) {
                    attributes.push({ node: attribute, name: attribute.name.name, value: literalValue(value) ?? null,
                        dynamic: Boolean(value) && literalValue(value) === null });
                }
            }
            if (attributes.length) {
                sites.push({ kind: "jsx-attributes", attributes });
            }
        },

        StringLiteral(path) {
            const { node, parent } = path;
            if (handled.has(node) || parent.type === "ImportDeclaration" || parent.type.startsWith("Export")
                    || parent.type === "JSXAttribute") {
                return;
            }
            const concatenated = parent.type === "BinaryExpression" && parent.operator === "+";
            if (!concatenated && isMarkup(node.value)) {
                sites.push({ kind: "markup", segment: segmentOf(node) });
            } else {
                checkString(node, node.value, concatenated);
            }
        },

        TemplateLiteral(path) {
            const { node } = path;
            if (handled.has(node)) {
                return;
            }
            const text = literalText(node.quasis.flatMap((quasi, index) => index < node.expressions.length
                ? [quasi, { type: "Expression" }] : [quasi]));
            if (isMarkup(node.quasis[0].value.cooked ?? "")) {
                sites.push({ kind: "markup", segment: node.expressions.length ? joinedSegment(leavesOf(node)) : segmentOf(node) });
            } else {
                checkString(node, text, node.expressions.length > 0);
            }
        },

        BinaryExpression(path) {
            const { node, parent } = path;
            if (node.operator !== "+" || (parent.type === "BinaryExpression" && parent.operator === "+") || handled.has(node)) {
                return;
            }
            const leaves = leavesOf(node);
            const first = leaves[0];
            if (first.type === "StringLiteral" && isMarkup(first.value)) {
                markLeaves(leaves);
                sites.push({ kind: "markup", segment: joinedSegment(leaves) });
            }
        }
    });

    return { sites, edits, reports };
}
