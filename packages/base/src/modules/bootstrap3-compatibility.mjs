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

import $ from "jquery";
import { Tooltip } from "bootstrap";

// Bootstrap 3 compatibility (deprecated since 24.0, will be removed in 25.0).
//
// Legacy markup (e.g. customized templates) uses Bootstrap 3 data attributes (data-toggle="dropdown",
// data-target, data-dismiss="alert", …), which Bootstrap 5 does not handle. They are copied to the Bootstrap 5 data
// attributes (data-bs-*) when the element is clicked or receives a key press, before Bootstrap handles the event.
// Collapsible elements shown by the Bootstrap 3 "in" class get the Bootstrap 5 "show" class instead and active tabs
// are marked on their Bootstrap 3 list items as well.
// Boolean tooltip and popover options given as strings are converted to booleans and a minimal replacement of the
// removed Affix plugin ($.fn.affix) toggles the affix and affix-top classes by the scroll position.

const TRIGGER_SELECTOR = "[data-toggle]:not([data-bs-toggle]), [data-dismiss]:not([data-bs-dismiss])";

const OPTIONS = ["toggle", "target", "dismiss", "parent", "placement", "container", "trigger", "offset", "boundary",
    "display", "backdrop", "keyboard"];

const copyAttributes = (element) => {
    OPTIONS.forEach((option) => {
        if (element.hasAttribute(`data-${option}`) && !element.hasAttribute(`data-bs-${option}`)) {
            element.setAttribute(`data-bs-${option}`, element.getAttribute(`data-${option}`));
        }
    });
};

const upgrade = (element) => {
    copyAttributes(element);
    if (element.getAttribute("data-toggle") === "collapse") {
        const target = element.getAttribute("data-target") || element.getAttribute("href");
        let targets = [];
        try {
            targets = target ? document.querySelectorAll(target) : [];
        } catch {
            // Not a selector (e.g. a link)
        }
        targets.forEach((collapse) => {
            if (collapse.classList.contains("in")) {
                collapse.classList.replace("in", "show");
            }
        });
    }
    // Bootstrap 3 marks the active tab by its list item, Bootstrap 5 by the tab itself
    if (/^(tab|pill)$/.test(element.getAttribute("data-toggle"))) {
        const nav = element.closest(".nav");
        nav?.querySelectorAll("[data-toggle]").forEach(copyAttributes);
        nav?.querySelectorAll(":scope > li.active > [data-toggle]").forEach((tab) => tab.classList.add("active"));
    }
};

// Keep Bootstrap 3 active list items in sync with the active tabs
document.addEventListener("shown.bs.tab", (event) => {
    if (event.target.matches("[data-toggle]")) {
        event.relatedTarget?.parentElement.classList.remove("active");
        event.target.parentElement.classList.add("active");
    }
});

const onEvent = (event) => {
    const element = event.target instanceof Element ? event.target.closest(TRIGGER_SELECTOR) : null;
    if (element) {
        upgrade(element);
    }
};

// Bootstrap 3 accepted "true" / "false" strings for boolean options of tooltips and popovers (e.g. html: "true"),
// Bootstrap 5 throws on them: such strings are converted to booleans before the options are checked
const configAfterMerge = Tooltip.prototype._configAfterMerge;
Tooltip.prototype._configAfterMerge = function (config) {
    const types = this.constructor.DefaultType;
    Object.keys(config).forEach((key) => {
        if (/\bboolean\b/.test(types[key]) && (config[key] === "true" || config[key] === "false")) {
            config[key] = config[key] === "true";
        }
    });
    return configAfterMerge.call(this, config);
};

// Bootstrap 3 Affix plugin (removed in Bootstrap 5): the element is affixed when the page is scrolled past offset.top
if (!$.fn.affix) {
    $.fn.affix = function (options = {}) {
        return this.each(function () {
            const element = this;
            const offset = typeof options.offset === "object" ? options.offset.top : options.offset;
            const update = () => {
                const top = typeof offset === "function" ? offset(element) : (offset || 0);
                const affixed = window.scrollY > top;
                element.classList.toggle("affix", affixed);
                element.classList.toggle("affix-top", !affixed);
            };
            if (!element.affixUpdate) {
                window.addEventListener("scroll", update, { passive: true });
            }
            element.affixUpdate = update;
            update();
        });
    };
}

// Capturing window listeners run before Bootstrap's own document listeners (delegated, also capturing)
window.addEventListener("click", onEvent, true);
window.addEventListener("keydown", onEvent, true);
