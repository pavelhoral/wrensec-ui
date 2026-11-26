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
import { migrateAttributes } from "./attributes.mjs";
import { gridGuardReport, isBootstrap3Prefix, migrateClasses } from "./classes.mjs";

/**
 * Scanner of HTML start tags in Handlebars templates (and HTML fragments in scripts).
 *
 * HTML parsers misread Handlebars inside tags (<input {{#if x}}checked{{/if}}>), so the scanner reads start tags
 * and their attributes only, skipping {{…}} expressions wherever they are.
 */

const VOID_ELEMENTS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source",
    "track", "wbr"]);

/** Offset after a Handlebars expression starting at the given offset. */
function mustacheEnd(text, start) {
    if (text.startsWith("{{!--", start)) {
        const end = text.indexOf("--}}", start + 5);
        return end === -1 ? text.length : end + 4;
    }
    const close = text.startsWith("{{{", start) ? "}}}" : "}}";
    const end = text.indexOf(close, start + close.length);
    return end === -1 ? text.length : end + close.length;
}

/** Whether a Handlebars expression produces no output (block helpers, else, comments). */
function isBlockMustache(expression) {
    return /^\{\{~?\s*(?:[#/^!*]|else\b)/.test(expression);
}

/**
 * Split an attribute value into class tokens. Tokens next to an output expression ({{size}}) are partial.
 */
function valueTokens(text, start, end) {
    const tokens = [];
    let current = null;
    let afterOutput = false;
    const close = (partial) => {
        if (current) {
            current.partial ||= partial;
            tokens.push(current);
            current = null;
        }
    };
    for (let index = start; index < end;) {
        if (text.startsWith("{{", index)) {
            const next = mustacheEnd(text, index);
            const output = !isBlockMustache(text.slice(index, next));
            close(output);
            afterOutput = output;
            index = next;
        } else if (/\s/.test(text[index])) {
            close(false);
            afterOutput = false;
            index++;
        } else {
            current ??= { start: index, partial: afterOutput };
            current.end = ++index;
            current.text = text.slice(current.start, current.end);
        }
    }
    close(false);
    return tokens;
}

/** Read a start tag at the given offset (text[offset] === "<"). */
function readStartTag(text, offset) {
    const name = /^<([a-zA-Z][\w:-]*)/.exec(text.slice(offset, offset + 64));
    if (!name) {
        return null;
    }
    const element = { tag: name[1].toLowerCase(), start: offset, attributes: [], selfClosing: false };
    let index = offset + name[0].length;
    while (index < text.length) {
        if (text.startsWith("{{", index)) {
            index = mustacheEnd(text, index);
        } else if (/\s/.test(text[index])) {
            index++;
        } else if (text[index] === ">") {
            element.end = index + 1;
            return element;
        } else if (text.startsWith("/>", index)) {
            element.selfClosing = true;
            element.end = index + 2;
            return element;
        } else {
            const attribute = { nameStart: index };
            while (index < text.length && !/[\s=>]/.test(text[index]) && !text.startsWith("{{", index)
                    && !text.startsWith("/>", index)) {
                index++;
            }
            if (index === attribute.nameStart) {
                index++;
                continue;
            }
            attribute.nameEnd = index;
            attribute.name = text.slice(attribute.nameStart, index);
            attribute.value = null;
            let valueIndex = index;
            while (/\s/.test(text[valueIndex] ?? "")) {
                valueIndex++;
            }
            if (text[valueIndex] === "=") {
                valueIndex++;
                while (/\s/.test(text[valueIndex] ?? "")) {
                    valueIndex++;
                }
                const quote = text[valueIndex] === "\"" || text[valueIndex] === "'" ? text[valueIndex] : null;
                attribute.valueStart = quote ? valueIndex + 1 : valueIndex;
                index = attribute.valueStart;
                while (index < text.length) {
                    if (text.startsWith("{{", index)) {
                        attribute.dynamic = true;
                        index = mustacheEnd(text, index);
                    } else if (quote ? text[index] === quote : /[\s>]/.test(text[index])) {
                        break;
                    } else {
                        index++;
                    }
                }
                attribute.valueEnd = index;
                attribute.value = text.slice(attribute.valueStart, index);
                if (quote) {
                    index++;
                }
            }
            element.attributes.push(attribute);
        }
    }
    return null;
}

/**
 * Scan the start tags of a template.
 *
 * @returns {object[]} elements with their tag, attributes, class tokens and parent element
 */
export function scanMarkup(text) {
    const elements = [];
    const stack = [];
    let index = 0;
    while (index < text.length) {
        if (text.startsWith("{{", index)) {
            index = mustacheEnd(text, index);
        } else if (text.startsWith("<!--", index)) {
            const end = text.indexOf("-->", index + 4);
            index = end === -1 ? text.length : end + 3;
        } else if (text.startsWith("</", index)) {
            const name = /^<\/([a-zA-Z][\w:-]*)/.exec(text.slice(index, index + 64));
            if (name) {
                const position = stack.findLastIndex((element) => element.tag === name[1].toLowerCase());
                if (position !== -1) {
                    stack.length = position;
                }
            }
            index += 2;
        } else if (text[index] === "<") {
            const element = readStartTag(text, index);
            if (!element) {
                index++;
                continue;
            }
            element.parent = stack.at(-1) ?? null;
            const classAttribute = element.attributes.find((attribute) => attribute.name.toLowerCase() === "class");
            element.classTokens = classAttribute?.value != null
                ? valueTokens(text, classAttribute.valueStart, classAttribute.valueEnd) : [];
            element.classes = new Set(element.classTokens.filter((token) => !token.partial).map((token) => token.text));
            elements.push(element);
            index = element.end;
            const type = element.attributes.find((attribute) => attribute.name.toLowerCase() === "type")?.value;
            if ((element.tag === "script" && !/handlebars|template/.test(type ?? "")) || element.tag === "style") {
                const end = text.toLowerCase().indexOf(`</${element.tag}`, index);
                index = end === -1 ? text.length : end;
            } else if (!element.selfClosing && !VOID_ELEMENTS.has(element.tag) && element.tag !== "script") {
                stack.push(element);
            }
        } else {
            index++;
        }
    }
    return elements;
}

/** Classes and data attributes used by scanned elements (the file context). */
export function markupUsage(elements) {
    const classes = new Set();
    const attributes = [];
    for (const element of elements) {
        element.classes.forEach((token) => classes.add(token));
        element.attributes.forEach((attribute) => attributes.push(attribute.name));
    }
    return { classes, attributes };
}

/** Edits removing a token and one adjacent whitespace run, without overlapping previous edits. */
function removeToken(text, token, valueStart, valueEnd, consumed) {
    let start = token.start;
    while (start > valueStart && /[ \t]/.test(text[start - 1])) {
        start--;
    }
    if (start < token.start && start >= consumed.until && start > valueStart) {
        return { start, end: token.end, text: "" };
    }
    let end = token.end;
    while (end < valueEnd && /[ \t]/.test(text[end])) {
        end++;
    }
    consumed.until = end;
    return { start: token.start, end, text: "" };
}

/** Edit removing an empty caret span of a dropdown toggle, with its line if it stands alone. */
function removeCaret(text, element) {
    const close = /^\s*<\/span\s*>/i.exec(text.slice(element.end));
    if (!close) {
        return null;
    }
    let start = element.start;
    let end = element.end + close[0].length;
    while (start > 0 && /[ \t]/.test(text[start - 1])) {
        start--;
    }
    const rest = /^[ \t]*\r?\n/.exec(text.slice(end));
    if ((start === 0 || text[start - 1] === "\n") && rest) {
        end += rest[0].length;
    }
    return { start, end, text: "" };
}

/**
 * Migrate the markup of scanned elements.
 *
 * @returns {{ edits: object[], reports: object[] }} edits and reports with offsets in the scanned text
 */
export function migrateMarkup(text, elements, file) {
    const edits = [];
    const reports = [];
    for (const element of elements) {
        const tokens = element.classTokens.filter((token) => !token.partial);
        const partial = element.classTokens.filter((token) => token.partial);
        for (const token of partial) {
            if (isBootstrap3Prefix(token.text) || /^(col-(xs|sm|md|lg)|label|btn|panel)-?$/.test(token.text)) {
                reports.push({ offset: token.start, rule: "dynamic-class", text: token.text,
                    message: "class completed by an expression, rename the Bootstrap 3 class by hand" });
            }
        }

        if (tokens.length === 1 && tokens[0].text === "caret" && element.tag === "span"
                && element.parent?.classes.has("dropdown-toggle")) {
            const edit = removeCaret(text, element);
            if (edit) {
                edits.push(edit);
                continue;
            }
        }

        const { result, reports: classReports } = migrateClasses(tokens.map((token) => token.text), {
            file,
            tag: element.tag,
            mode: "markup",
            parent: element.parent?.classes,
            context: partial.map((token) => token.text)
        });
        const classAttribute = element.attributes.find((attribute) => attribute.name.toLowerCase() === "class");
        const consumed = { until: 0 };
        if (tokens.length && result.every((renamed) => renamed && !renamed.length) && !classAttribute.dynamic) {
            // All classes removed: remove the attribute
            let start = classAttribute.nameStart;
            while (/[ \t]/.test(text[start - 1])) {
                start--;
            }
            const quoted = /["']/.test(text[classAttribute.valueEnd] ?? "");
            edits.push({ start, end: classAttribute.valueEnd + (quoted ? 1 : 0), text: "" });
            result.fill(null);
        }
        result.forEach((renamed, index) => {
            const token = tokens[index];
            if (renamed?.length) {
                edits.push({ start: token.start, end: token.end, text: renamed.join(" ") });
            } else if (renamed) {
                edits.push(removeToken(text, token, classAttribute.valueStart, classAttribute.valueEnd, consumed));
            }
        });
        const guard = gridGuardReport(tokens.map((token) => token.text), file);
        for (const report of guard ? [...classReports, guard] : classReports) {
            reports.push({ offset: tokens[report.index].start, rule: report.rule, text: tokens[report.index].text,
                message: report.message });
        }

        const attributes = element.attributes.filter((attribute) => /^(data-|rel$)/i.test(attribute.name));
        const migrated = migrateAttributes(attributes.map((attribute) => ({
            name: attribute.name,
            value: attribute.value,
            dynamic: attribute.dynamic
        })));
        migrated.result.forEach((name, index) => {
            if (name) {
                edits.push({ start: attributes[index].nameStart, end: attributes[index].nameEnd, text: name });
            }
        });
        for (const report of migrated.reports) {
            const attribute = attributes[report.index];
            reports.push({ offset: attribute.nameStart, rule: report.rule, message: report.message,
                text: text.slice(attribute.nameStart, attribute.valueEnd ?? attribute.nameEnd) });
        }
    }
    return { edits, reports };
}
