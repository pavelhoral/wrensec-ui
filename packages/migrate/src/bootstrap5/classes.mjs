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
 * Bootstrap 3 to Bootstrap 5 class renames.
 *
 * Every token of a class list is renamed once, from its original value, so a renamed token is never renamed again
 * (col-sm-6 becomes col-md-6, not col-lg-6).
 */

/** Bootstrap 3 grid tiers and the Bootstrap 5 tiers with the same breakpoints. */
const TIERS = { xs: "", sm: "md", md: "lg", lg: "xl" };

/** The next Bootstrap 5 tier (hides an element shown only on one Bootstrap 3 tier). */
const NEXT_TIER = { "": "md", md: "lg", lg: "xl", xl: null };

const VARIANTS = ["primary", "success", "info", "warning", "danger"];

/** Plain renames, an empty list removes the class. */
const RENAMES = new Map(Object.entries({
    "panel": ["card"],
    "panel-heading": ["card-header"],
    "panel-body": ["card-body"],
    "panel-footer": ["card-footer"],
    "panel-title": ["card-title"],
    "panel-default": [],
    "well": ["card", "card-body"],
    "well-sm": [],
    "well-lg": [],
    "help-block": ["form-text"],
    "form-control-static": ["form-control-plaintext"],
    "input-group-addon": ["input-group-text"],
    "btn-default": ["btn-outline-primary"],
    "btn-xs": ["btn-sm"],
    "btn-block": ["w-100"],
    "btn-group-xs": ["btn-group-sm"],
    "dropdown-menu-right": ["dropdown-menu-end"],
    "dropdown-menu-left": ["dropdown-menu-start"],
    "pull-left": ["float-start"],
    "pull-right": ["float-end"],
    "text-left": ["text-start"],
    "text-right": ["text-end"],
    "center-block": ["d-block", "mx-auto"],
    "hidden": ["d-none"],
    "hide": ["d-none"],
    "sr-only": ["visually-hidden"],
    "sr-only-focusable": ["visually-hidden-focusable"],
    "hidden-print": ["d-print-none"],
    "visible-print": ["d-none", "d-print-block"],
    "visible-print-block": ["d-none", "d-print-block"],
    "visible-print-inline": ["d-none", "d-print-inline"],
    "visible-print-inline-block": ["d-none", "d-print-inline-block"],
    "table-condensed": ["table-sm"],
    "nav-stacked": ["flex-column"],
    "img-responsive": ["img-fluid"],
    "img-rounded": ["rounded"],
    "img-circle": ["rounded-circle"],
    "embed-responsive": ["ratio"],
    "embed-responsive-16by9": ["ratio-16x9"],
    "embed-responsive-4by3": ["ratio-4x3"],
    "embed-responsive-item": [],
    "text-muted": ["text-body-secondary"],
    "label-default": ["text-bg-secondary"],
    ...Object.fromEntries(VARIANTS.map((variant) => [`label-${variant}`, [`text-bg-${variant}`]])),
    ...Object.fromEntries(VARIANTS.filter((variant) => variant !== "primary")
        .map((variant) => [`progress-bar-${variant}`, [`bg-${variant}`]]))
}));

const MEDIA = "flex utilities (d-flex, flex-shrink-0, flex-grow-1 ms-3)";
const NAVBAR = "navbar-expand-*, data-bs-theme=\"dark\" (not navbar-dark), navbar-toggler with navbar-toggler-icon, "
    + "a container inside, ms-auto";
const CHECKBOX = "form-check (form-check-inline) with form-check-input and form-check-label as siblings";

/**
 * Classes of structural markup that is reported, not converted: rule name, Bootstrap 5 replacement and an optional
 * class whose presence in the file shows that the markup has been migrated already.
 */
const REPORTED = new Map(Object.entries({
    "checkbox": ["checkbox", CHECKBOX],
    "radio": ["checkbox", CHECKBOX],
    "checkbox-inline": ["checkbox", CHECKBOX],
    "radio-inline": ["checkbox", CHECKBOX],
    "form-inline": ["form-layout", "grid and spacing utilities"],
    "form-group-lg": ["form-layout", "grid and spacing utilities (form-control-lg on the controls)"],
    "form-group-sm": ["form-layout", "grid and spacing utilities (form-control-sm on the controls)"],
    "input-group-btn": ["input-group-btn", "the button goes directly into input-group"],
    "panel-group": ["panel-group", "the accordion component for collapsible groups, spacing utilities otherwise"],
    "nav-tabs": ["nav", "nav-item on <li>, nav-link on <a>, active moves from the <li> to the link", "nav-link"],
    "nav-pills": ["nav", "nav-item on <li>, nav-link on <a>, active moves from the <li> to the link", "nav-link"],
    "navbar-default": ["navbar", NAVBAR],
    "navbar-inverse": ["navbar", NAVBAR],
    "navbar-toggle": ["navbar", NAVBAR],
    "navbar-header": ["navbar", NAVBAR],
    "navbar-right": ["navbar", NAVBAR],
    "navbar-left": ["navbar", NAVBAR],
    "navbar-form": ["navbar", NAVBAR],
    "navbar-btn": ["navbar", NAVBAR],
    "navbar-fixed-top": ["navbar", "fixed-top"],
    "navbar-fixed-bottom": ["navbar", "fixed-bottom"],
    "navbar-static-top": ["navbar", "no class (static is the default)"],
    "pagination": ["pagination", "page-item on <li>, page-link on <a>", "page-item"],
    "pager": ["pagination", "pagination with page-item and page-link"],
    "breadcrumb": ["breadcrumb", "breadcrumb-item on <li>", "breadcrumb-item"],
    "btn-group-justified": ["btn-group-justified", "btn-group d-flex with w-100 buttons"],
    "media": ["media", MEDIA],
    "media-left": ["media", MEDIA],
    "media-right": ["media", MEDIA],
    "media-middle": ["media", MEDIA],
    "media-bottom": ["media", MEDIA],
    "media-body": ["media", MEDIA],
    "media-heading": ["media", MEDIA],
    "media-object": ["media", MEDIA],
    "media-list": ["media", MEDIA],
    "thumbnail": ["thumbnail", "card (card-img-top, card-body)"],
    "jumbotron": ["jumbotron", "utilities (p-5 mb-4 bg-body-tertiary rounded-3)"],
    "dl-horizontal": ["dl-horizontal", "row with columns on <dt> and <dd>"],
    "list-inline": ["list-inline", "list-inline-item on the items", "list-inline-item"],
    "list-group-item-heading": ["list-group-item", "utilities (mb-1)"],
    "list-group-item-text": ["list-group-item", "utilities (mb-1)"],
    "progress-striped": ["progress", "progress-bar-striped on the bar"],
    "carousel": ["carousel", "Bootstrap 5 carousel markup (carousel-item, carousel-control-prev, …)", "carousel-item"],
    "glyphicon": ["glyphicon", "Font Awesome icons"],
    "close": ["close", "btn-close, empty (no &times;)"],
    "affix": ["affix", "position: sticky (sticky-top)"],
    "affix-top": ["affix", "position: sticky (sticky-top)"],
    "affix-bottom": ["affix", "position: sticky (sticky-top)"]
}));

/**
 * Classes that only Bootstrap 5 markup uses. A file that contains one of them is not tier-shifted, because a
 * second run must not shift a migrated layout again.
 */
const BOOTSTRAP5_MARKERS = new RegExp("^(?:col-(?:\\d+|auto)|col-(?:sm|md|lg|xl|xxl)-auto|col-xxl?-\\d+"
    + "|offset-(?:(?:sm|md|lg|xl|xxl)-)?\\d+|row-cols-.+|g[xy]?-\\d|form-select|form-check-input|float-(?:start|end)"
    + "|text-(?:start|end)|visually-hidden(?:-focusable)?|form-text|col-form-label|form-control-plaintext"
    + "|input-group-text|dropdown-menu-(?:start|end)|dropdown-divider|dropdown-item|text-bg-.+|rounded-pill"
    + "|img-fluid|table-sm|btn-outline-primary|text-body-secondary|d-(?:none|block|flex)|nav-link)$");

/** Grid classes whose meaning differs between Bootstrap 3 and Bootstrap 5 (the tier shift). */
const AMBIGUOUS_GRID = /^col-(?:sm|md|lg)-\d+$/;

/** A class with a known Bootstrap 3 meaning (a candidate for reports of dynamic class lists). */
export function isBootstrap3Class(token) {
    return RENAMES.has(token) || (REPORTED.has(token) && !REPORTED.get(token)[2]) || /^col-(xs|sm|md|lg)-/.test(token)
        || /^(hidden|visible)-(xs|sm|md|lg)/.test(token) || token === "control-label";
}

/** A class that only Bootstrap 3 markup uses (evidence that a file has not been migrated). */
function isBootstrap3Only(token) {
    return isBootstrap3Class(token) && !AMBIGUOUS_GRID.test(token) && !["hidden", "hide"].includes(token);
}

/** A Bootstrap 3 prefix of a class completed at runtime ("col-sm-" + size). */
export function isBootstrap3Prefix(text) {
    return /(^|\s)(col-(xs|sm|md|lg)-(offset-|push-|pull-)?|label-|progress-bar-|panel-|(hidden|visible)-)$/.test(text);
}

/**
 * Context of a file: every class used by the file decides renames that depend on other markup (form-horizontal
 * for control-label) and whether the grid is shifted.
 */
export class FileContext {

    /**
     * @param {Set<string>} classes all classes found in the file
     * @param {boolean} bootstrap5Attributes the file contains data-bs-* attributes
     */
    constructor(classes, bootstrap5Attributes = false) {
        this.classes = classes;
        const markers = Array.from(classes).filter((token) => BOOTSTRAP5_MARKERS.test(token));
        this.bootstrap5 = markers.length > 0 || bootstrap5Attributes;
        this.markers = bootstrap5Attributes ? [...markers, "data-bs-*"] : markers;
        this.gridShift = !this.bootstrap5;
        this.bootstrap3 = Array.from(classes).some(isBootstrap3Only);
    }

    has(token) {
        return this.classes.has(token);
    }
}

/**
 * Rename the classes of one class list.
 *
 * @param {string[]} tokens the complete class tokens of the list
 * @param {object} options
 * @param {FileContext} options.file file context
 * @param {string} [options.tag] element name, when known
 * @param {"markup"|"add"|"remove"|"has"|"selector"} options.mode how the list is used: element markup, a list of
 *        added, removed or tested classes (jQuery), or a compound selector
 * @param {Set<string>} [options.parent] classes of the parent element, when known
 * @param {string[]} [options.context] other classes of the list that can't be renamed (partial tokens)
 * @returns {{ result: (string[]|null)[], reports: { index: number, rule: string, message: string }[] }} the new
 *          classes of each token (null for an unchanged token) and the reported tokens
 */
export function migrateClasses(tokens, { file, tag, mode, parent, context = [] }) {
    const list = new Set([...tokens, ...context]);
    const result = tokens.map(() => null);
    const reports = [];
    const lowerTag = tag?.toLowerCase();
    const isTableCell = ["tr", "td", "th"].includes(lowerTag);
    const adding = mode === "markup" || mode === "add";
    const report = (index, rule, message) => reports.push({ index, rule, message });
    const visibleWithDisplay = tokens.filter((token) => /^visible-(xs|sm|md|lg)-(block|inline|inline-block)$/.test(token));
    const hasLabelVariant = tokens.some((token) => /^label-(default|primary|success|info|warning|danger)$/.test(token));
    const hasBackground = Array.from(list).some((token) => /^(text-bg|bg)-/.test(token) || token === "rounded-pill");

    tokens.forEach((token, index) => {
        const column = /^col-(xs|sm|md|lg)-(\d{1,2})$/.exec(token);
        const offset = /^col-(xs|sm|md|lg)-offset-(\d{1,2})$/.exec(token);
        const visible = /^visible-(xs|sm|md|lg)-(block|inline|inline-block)$/.exec(token);
        let renamed = null;
        if (column) {
            if (column[1] === "xs") {
                renamed = [`col-${column[2]}`];
            } else if (file.gridShift) {
                renamed = [`col-${TIERS[column[1]]}-${column[2]}`];
            }
        } else if (offset) {
            renamed = [offset[1] === "xs" ? `offset-${offset[2]}` : `offset-${TIERS[offset[1]]}-${offset[2]}`];
        } else if (/^col-(xs|sm|md|lg)-(push|pull)-\d{1,2}$/.test(token)) {
            report(index, "grid-push-pull", "order-* (only order-1 to order-5)");
        } else if (visible) {
            if (visibleWithDisplay.length > 1) {
                report(index, "responsive-visibility", "d-none with d-{tier}-{display} per tier (tiers shift like the grid)");
            } else {
                const tier = TIERS[visible[1]];
                const next = NEXT_TIER[tier];
                renamed = tier ? ["d-none", `d-${tier}-${visible[2]}`] : [`d-${visible[2]}`];
                if (next) {
                    renamed.push(`d-${next}-none`);
                }
            }
        } else if (/^(hidden|visible)-(xs|sm|md|lg)$/.test(token)) {
            report(index, "responsive-visibility",
                "d-none d-md-block and similar (tiers shift like the grid); the display type depends on the element");
        } else if (/^checkbox-slider/.test(token)) {
            if (!list.has("form-switch")) {
                report(index, "switch", "form-check form-switch with the input before its label");
            }
        } else if (token === "label") {
            if (hasLabelVariant) {
                renamed = ["badge"];
            } else if (mode !== "selector") {
                report(index, "label", "badge text-bg-secondary (if it is a Bootstrap 3 label)");
            }
        } else if (token === "badge") {
            if (adding && !hasBackground) {
                renamed = ["badge", "rounded-pill", "text-bg-secondary"];
            }
        } else if (token === "active") {
            if (list.has("progress-bar")) {
                renamed = ["progress-bar-animated"];
            } else if (isTableCell) {
                renamed = ["table-active"];
            }
        } else if (VARIANTS.includes(token) && token !== "primary") {
            if (isTableCell) {
                renamed = [`table-${token}`];
            }
        } else if (token === "in") {
            if (["fade", "collapse", "modal", "tooltip", "popover"].some((name) => list.has(name))) {
                renamed = ["show"];
            } else {
                report(index, "in", "show (the state class of fade, collapse, modal, tooltip and popover)");
            }
        } else if (token === "form-control") {
            if (lowerTag === "select") {
                renamed = ["form-select"];
            }
        } else if (token === "input-lg" || token === "input-sm") {
            renamed = [`${lowerTag === "select" ? "form-select" : "form-control"}-${token.slice(-2)}`];
        } else if (token === "control-label") {
            if (file.has("form-horizontal")) {
                renamed = ["col-form-label"];
            } else {
                report(index, "control-label", "col-form-label in horizontal forms, form-label in stacked ones");
            }
        } else if ((token === "pull-right" || token === "pull-left") && list.has("dropdown-menu")) {
            renamed = [token === "pull-right" ? "dropdown-menu-end" : "dropdown-menu-start"];
        } else if (token === "divider") {
            if (parent ? parent.has("dropdown-menu") : file.has("dropdown-menu")) {
                renamed = ["dropdown-divider"];
            }
        } else if (token === "list-group-item") {
            if (adding && ["a", "button"].includes(lowerTag) && !list.has("list-group-item-action")) {
                renamed = ["list-group-item", "list-group-item-action"];
            }
        } else if (/^panel-(primary|success|info|warning|danger)$/.test(token)) {
            report(index, "panel-color", "border-* on the card with text-bg-* on the card-header");
        } else if (RENAMES.has(token)) {
            renamed = RENAMES.get(token);
        } else if (REPORTED.has(token)) {
            const [rule, message, migrated] = REPORTED.get(token);
            // Classes that Bootstrap 5 keeps (nav-tabs, pagination, …) need changes in markup, not in selectors
            if (!migrated || (!file.has(migrated) && mode === "markup")) {
                report(index, rule, message);
            }
        }

        result[index] = renamed;
    });

    // Drop new classes that the list has already (kept classes and classes added by previous renames)
    const final = new Set(tokens.filter((token, index) => !result[index]));
    result.forEach((renamed, index) => {
        if (renamed) {
            result[index] = renamed.filter((name) => {
                const added = !final.has(name);
                final.add(name);
                return added;
            });
        }
    });

    return { result, reports };
}

/**
 * Report a file whose grid is not shifted (it contains Bootstrap 5 classes) and still contains grid classes that
 * may be Bootstrap 3 ones.
 */
export function gridGuardReport(tokens, file) {
    if (file.gridShift || !file.bootstrap3) {
        return null;
    }
    const index = tokens.findIndex((token) => AMBIGUOUS_GRID.test(token));
    return index === -1 ? null : {
        index,
        rule: "grid-guard",
        message: `grid tiers not shifted, the file already contains Bootstrap 5 classes (${file.markers.slice(0, 3).join(", ")}); `
            + "shift remaining Bootstrap 3 tiers by hand (col-sm-* → col-md-*, …)"
    };
}
