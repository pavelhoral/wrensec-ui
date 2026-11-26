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
 * Conversion of Less values (declaration values, variable values, mixin arguments, at-rule parameters) to SCSS.
 */

/** Variables of the former common/forgerock-variables.less, CSS custom properties --wrensec-* in SCSS. */
export const COMMONS_VARIABLES = new Set(["base-theme-color", "panel-hover-color", "background-color", "success-color",
    "failure-color", "warning-color", "navbar-toggle-color", "subnav-small-device-hover",
    "subnav-small-device-active-background", "subnav-small-device-active-color", "modal-background-color",
    "footer-height"]);

/** Breakpoint variables of the former common/forgerock-variables.less and their Bootstrap 5 tiers. */
export const SCREEN_VARIABLES = { "screen-xs": "xs", "screen-sm": "md", "screen-md": "lg", "screen-lg": "xl" };

/** Less color functions: Sass function and the adjusted parameter. */
const COLOR_FUNCTIONS = {
    darken: ["adjust", "$lightness", -1, "%"],
    lighten: ["adjust", "$lightness", 1, "%"],
    saturate: ["adjust", "$saturation", 1, "%"],
    desaturate: ["adjust", "$saturation", -1, "%"],
    fadein: ["adjust", "$alpha", 1, "alpha"],
    fadeout: ["adjust", "$alpha", -1, "alpha"],
    fade: ["change", "$alpha", 1, "alpha"],
    spin: ["adjust", "$hue", 1, ""]
};

/** Less functions without a direct Sass replacement. */
const UNSUPPORTED_FUNCTIONS = new Set(["e", "%", "escape", "unit", "get-unit", "data-uri", "svg-gradient", "image-size",
    "image-width", "image-height", "convert", "iscolor", "isnumber", "isstring", "iskeyword", "isurl", "ispixel",
    "isem", "ispercentage", "isunit", "isruleset", "contrast", "luma", "luminance", "tint", "shade", "greyscale",
    "multiply", "screen", "overlay", "softlight", "hardlight", "difference", "exclusion", "average", "negation",
    "range", "each", "extract", "length", "if", "boolean"]);

/** Split function arguments at top-level commas (or semicolons, the Less alternative). */
export function splitArguments(text) {
    const separator = /;/.test(text.replace(/(["'])(?:\\.|(?!\1).)*\1/g, "")) ? ";" : ",";
    const result = [];
    let depth = 0;
    let quote = null;
    let current = "";
    for (let index = 0; index < text.length; index++) {
        const char = text[index];
        if (quote) {
            if (char === "\\") {
                current += char + text[++index];
                continue;
            }
            if (char === quote) {
                quote = null;
            }
        } else if (char === "\"" || char === "'") {
            quote = char;
        } else if (char === "(") {
            depth++;
        } else if (char === ")") {
            depth--;
        } else if (char === separator && depth === 0) {
            result.push(current.trim());
            current = "";
            continue;
        }
        current += char;
    }
    if (current.trim() || result.length) {
        result.push(current.trim());
    }
    return result;
}

/** Offset after the parenthesis closing the one at the given offset. */
function closingParenthesis(text, open) {
    let depth = 0;
    let quote = null;
    for (let index = open; index < text.length; index++) {
        const char = text[index];
        if (quote) {
            if (char === "\\") {
                index++;
            } else if (char === quote) {
                quote = null;
            }
        } else if (char === "\"" || char === "'") {
            quote = char;
        } else if (char === "(") {
            depth++;
        } else if (char === ")" && --depth === 0) {
            return index + 1;
        }
    }
    return -1;
}

/** Convert Less interpolation (@{name}) in strings and selectors to Sass interpolation (#{$name}). */
export function convertInterpolation(text, context) {
    return text.replace(/@\{([\w-]+)\}/g, (match, name) => {
        context.use?.(name);
        return `#{$${name}}`;
    });
}

/** Convert a variable reference. */
function variable(name, context, sass) {
    if (COMMONS_VARIABLES.has(name)) {
        if (sass) {
            context.uses.add("common/variables");
            return `variables.$${name}`;
        }
        return `var(--wrensec-${name})`;
    }
    if (SCREEN_VARIABLES[name]) {
        context.uses.add("common/variables");
        context.report("breakpoint-variable", `@${name} was removed, use @include mixins.media-up(${SCREEN_VARIABLES[name]}) `
            + `or map.get(variables.$breakpoints, ${SCREEN_VARIABLES[name]})`);
        return `$${name}`;
    }
    context.use(name);
    return `$${name}`;
}

/**
 * Convert a Less value to SCSS.
 *
 * @param {string} text Less value
 * @param {object} context conversion context
 * @param {Set<string>} context.uses modules the file has to use (sass:color, common/variables)
 * @param {function(string)} context.use record a product variable used by the file
 * @param {function(string, string)} context.report report a construct that is not converted (rule, message)
 * @param {boolean} [sass] the value is an argument of a Sass function (commons variables are Sass variables)
 */
export function convertValue(text, context, sass = false) {
    // Each token: pattern at the current offset and its conversion ([output, length of the input])
    const tokens = [
        [/^\/\*[\s\S]*?(?:\*\/|$)/, (match) => [match[0], match[0].length]],
        [/^url\(/i, (match, index) => {
            const end = closingParenthesis(text, index + 3);
            const next = end === -1 ? text.length : end;
            return [convertInterpolation(text.slice(index, next), context), next - index];
        }],
        [/^~(["'])((?:\\.|(?!\1).)*)\1/, (match) => [convertInterpolation(match[2], context), match[0].length]],
        [/^(["'])(?:\\.|(?!\1).)*\1/, (match) => [convertInterpolation(match[0], context), match[0].length]],
        [/^@\{([\w-]+)\}/, (match) => [convertInterpolation(match[0], context), match[0].length]],
        [/^@([a-zA-Z_][\w-]*)/, (match) => [variable(match[1], context, sass), match[0].length]],
        [/^([a-zA-Z%][\w-]*)\(/, (match, index) => {
            if (index > 0 && /[\w-]/.test(text[index - 1])) {
                return null;
            }
            const end = closingParenthesis(text, index + match[1].length);
            if (end === -1) {
                return [text.slice(index), text.length - index];
            }
            // eslint-disable-next-line no-use-before-define -- convertFunction converts its arguments recursively
            return [convertFunction(match[1], text.slice(index + match[1].length + 1, end - 1), context, sass), end - index];
        }]
    ];
    let result = "";
    let index = 0;
    while (index < text.length) {
        const rest = text.slice(index);
        let converted = null;
        for (const [pattern, convert] of tokens) {
            const match = pattern.exec(rest);
            converted = match ? convert(match, index) : null;
            if (converted) {
                break;
            }
        }
        const [output, length] = converted ?? [text[index], 1];
        result += output;
        index += length;
    }
    return result;
}

/** Convert a function call. */
function convertFunction(name, inner, context, sass) {
    const args = splitArguments(inner);
    const lower = name.toLowerCase();
    if (lower === "darken" && /^@base-theme-color$/.test(args[0]) && /^5%$/.test(args[1] ?? "") && !sass) {
        return "var(--wrensec-base-theme-color-dark)";
    }
    if (COLOR_FUNCTIONS[lower] && args.length === 2) {
        const [kind, parameter, sign, unit] = COLOR_FUNCTIONS[lower];
        context.uses.add("sass:color");
        const color = convertValue(args[0], context, true);
        let amount = convertValue(args[1], context, true);
        const number = /^(-?[\d.]+)(%?)$/.exec(amount);
        if (unit === "alpha" && number) {
            amount = String(Number(number[1]) / (number[2] ? 100 : 1));
        }
        if (sign < 0) {
            amount = number ? (amount.startsWith("-") ? amount.slice(1) : `-${amount}`) : `-1 * ${amount}`;
        }
        return `color.${kind}(${color}, ${parameter}: ${amount})`;
    }
    if (lower === "mix" && (args.length === 2 || args.length === 3)) {
        context.uses.add("sass:color");
        return `color.mix(${args.map((arg) => convertValue(arg, context, true)).join(", ")})`;
    }
    if (UNSUPPORTED_FUNCTIONS.has(lower)) {
        context.report("less-function", `${name}() has no Sass equivalent, rewrite the value`);
    }
    return `${name}(${convertValue(inner, context, sass)})`;
}
