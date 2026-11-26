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

/**
 * Bootstrap 3 to Bootstrap 5 data attribute renames (data-toggle → data-bs-toggle, …).
 */

/** data-toggle values of Bootstrap plugins (other values belong to applications and are left alone). */
const TOGGLES = new Set(["collapse", "tab", "pill", "dropdown", "popover", "tooltip", "modal", "button"]);

/** Attributes that mark a Bootstrap element (with their Bootstrap values, null for any value). */
const MARKERS = {
    "rel": new Set(["tooltip", "popover"]),
    "data-dismiss": null,
    "data-spy": new Set(["scroll"]),
    "data-ride": new Set(["carousel"]),
    "data-slide": null,
    "data-slide-to": null
};

/** Option attributes of Bootstrap plugins, renamed on Bootstrap elements. */
const OPTIONS = new Set([
    "data-target", "data-dismiss", "data-placement", "data-content", "data-parent", "data-trigger", "data-container",
    "data-html", "data-delay", "data-backdrop", "data-keyboard", "data-title", "data-animation", "data-template",
    "data-selector", "data-show", "data-interval", "data-pause", "data-wrap", "data-slide", "data-slide-to",
    "data-ride", "data-spy", "data-boundary", "data-reference", "data-display", "data-focus", "data-sanitize",
    "data-auto-close", "data-touch", "data-fallback-placements", "data-custom-class"
]);

/** Options removed in Bootstrap 5 (reported). */
const REMOVED_OPTIONS = {
    "data-remote": "the modal remote option was removed, load the content with JavaScript",
    "data-viewport": "the viewport option was removed, use data-bs-boundary",
    "data-flip": "the flip option was removed, use data-bs-popper-config"
};

/**
 * Rename the data attributes of one element (or one compound selector).
 *
 * @param {{ name: string, value: ?string, dynamic?: boolean }[]} attributes attributes with their values (null when
 *        the value is not known, e.g. [data-toggle] selectors)
 * @param {object} [options]
 * @param {boolean} [options.selector] attributes of a selector (option attributes are renamed only with a toggle)
 * @returns {{ result: (string|null)[], reports: { index: number, rule: string, message: string }[] }}
 */
export function migrateAttributes(attributes, { selector = false } = {}) {
    const result = attributes.map(() => null);
    const reports = [];
    const find = (name) => attributes.findIndex((attribute) => attribute.name.toLowerCase() === name);
    const toggleIndex = find("data-toggle");
    const toggle = attributes[toggleIndex];
    let bootstrap = false;

    if (toggle) {
        if (toggle.dynamic) {
            reports.push({ index: toggleIndex, rule: "data-toggle", message: "data-bs-toggle (for Bootstrap plugin values)" });
        } else if (toggle.value === "buttons") {
            reports.push({ index: toggleIndex, rule: "btn-group-toggle", message: "btn-check inputs with btn labels" });
        } else if (toggle.value === null) {
            if (selector) {
                reports.push({ index: toggleIndex, rule: "data-toggle", message: "data-bs-toggle (for Bootstrap plugin values)" });
            }
        } else if (TOGGLES.has(toggle.value)) {
            bootstrap = true;
            result[toggleIndex] = "data-bs-toggle";
        }
    }
    if (!selector) {
        for (const [name, values] of Object.entries(MARKERS)) {
            const attribute = attributes[find(name)];
            if (attribute && (!values || attribute.dynamic || values.has(attribute.value))) {
                bootstrap = true;
            }
        }
    } else if (!toggle) {
        const dismiss = find("data-dismiss");
        if (dismiss !== -1) {
            bootstrap = true;
        }
    }
    const spy = attributes[find("data-spy")];
    if (spy?.value === "affix") {
        reports.push({ index: find("data-spy"), rule: "affix", message: "position: sticky (sticky-top)" });
    }

    attributes.forEach((attribute, index) => {
        const name = attribute.name.toLowerCase();
        if (name === "data-original-title") {
            reports.push({ index, rule: "plugin-api", message: "data-bs-original-title is internal to Bootstrap 5, use title" });
        } else if (bootstrap && REMOVED_OPTIONS[name]) {
            reports.push({ index, rule: "plugin-api", message: REMOVED_OPTIONS[name] });
        } else if (bootstrap && OPTIONS.has(name) && result[index] === null) {
            result[index] = `data-bs-${name.slice(5)}`;
        }
    });

    return { result, reports };
}

/** Whether attributes contain a Bootstrap 5 data attribute (the element has been migrated). */
export function hasBootstrap5Attributes(names) {
    return names.some((name) => /^data-bs-/i.test(name));
}
