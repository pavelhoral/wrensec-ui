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
import selectorParser from "postcss-selector-parser";
import { migrateAttributes } from "./attributes.mjs";
import { gridGuardReport, migrateClasses } from "./classes.mjs";

/**
 * Migration of CSS selectors in styles and scripts (.panel-body > .btn-default, [data-toggle=tab]).
 */

/** Parse a selector, null if it is not a valid selector. */
export function parseSelector(text) {
    try {
        return selectorParser().astSync(text, { lossless: true });
    } catch {
        return null;
    }
}

/** Compound selectors (nodes between combinators) of a parsed selector, including selectors nested in pseudos. */
function compounds(root) {
    const result = [];
    root.walk((node) => {
        if (node.type !== "selector") {
            return;
        }
        let compound = [];
        for (const child of node.nodes) {
            if (child.type === "combinator") {
                result.push(compound);
                compound = [];
            } else if (child.type !== "comment") {
                compound.push(child);
            }
        }
        result.push(compound);
    });
    return result.filter((compound) => compound.length);
}

/** Classes and attribute names used by a parsed selector (the file context). */
export function selectorUsage(root) {
    const classes = new Set();
    const attributes = [];
    root.walk((node) => {
        if (node.type === "class") {
            classes.add(node.value);
        } else if (node.type === "attribute") {
            attributes.push(node.attribute);
        }
    });
    return { classes, attributes };
}

/**
 * Migrate a parsed selector.
 *
 * @returns {{ edits: object[], reports: object[] }} edits and reports with offsets in the selector text
 */
export function migrateSelector(text, root, file) {
    const edits = [];
    const reports = [];
    for (const compound of compounds(root)) {
        const classNodes = compound.filter((node) => node.type === "class");
        const tag = compound.find((node) => node.type === "tag")?.value;
        const tokens = classNodes.map((node) => node.value);
        const { result, reports: classReports } = migrateClasses(tokens, { file, tag, mode: "selector" });
        const removed = result.filter((renamed) => renamed && !renamed.length).length;
        result.forEach((renamed, index) => {
            const node = classNodes[index];
            const start = node.sourceIndex;
            const end = start + 1 + (node.raws?.value ?? node.value).length;
            if (!renamed || text.slice(start, end) !== `.${node.raws?.value ?? node.value}`) {
                return;
            }
            if (renamed.length) {
                edits.push({ start, end, text: renamed.map((name) => `.${name}`).join("") });
            } else if (removed < compound.length) {
                edits.push({ start, end, text: "" });
            } else {
                reports.push({ offset: start, rule: "removed-class", text: `.${node.value}`,
                    message: "the class was removed in Bootstrap 5 and the selector has nothing else to match, "
                        + "rewrite the rule" });
            }
        });
        const guard = gridGuardReport(tokens, file);
        for (const report of guard ? [...classReports, guard] : classReports) {
            reports.push({ offset: classNodes[report.index].sourceIndex, rule: report.rule,
                text: `.${tokens[report.index]}`, message: report.message });
        }

        const attributeNodes = compound.filter((node) => node.type === "attribute");
        const migrated = migrateAttributes(attributeNodes.map((node) => ({ name: node.attribute, value: node.value ?? null })),
            { selector: true });
        migrated.result.forEach((name, index) => {
            const node = attributeNodes[index];
            const start = text.indexOf(node.attribute, node.sourceIndex);
            if (name && start !== -1) {
                edits.push({ start, end: start + node.attribute.length, text: name });
            }
        });
        for (const report of migrated.reports) {
            const node = attributeNodes[report.index];
            reports.push({ offset: node.sourceIndex, rule: report.rule, text: String(node).trim(), message: report.message });
        }
    }
    return { edits, reports };
}
