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
 * A piece of text taken from a source file, with the source offset of each of its characters.
 *
 * Migrations find edits in the segment text (e.g. the value of a JavaScript string literal) and the segment maps
 * them back to the source file (e.g. the raw literal with its escape sequences).
 */
export class Segment {

    /**
     * @param {string} text segment text
     * @param {number[]} map source offset of each character, plus the source offset of the segment end
     */
    constructor(text, map) {
        this.text = text;
        this.map = map;
    }

    /**
     * Create a segment of source text that is used as it is.
     */
    static plain(text, offset) {
        return new Segment(text, Array.from({ length: text.length + 1 }, (value, index) => offset + index));
    }

    /**
     * Create a segment by joining segments and opaque placeholders (e.g. expressions concatenated with string
     * literals). Placeholders map to the given source offset and must not be edited.
     */
    static join(parts) {
        let text = "";
        const map = [];
        for (const part of parts) {
            if (part instanceof Segment) {
                text += part.text;
                map.push(...part.map.slice(0, -1));
            } else {
                text += part.text;
                map.push(...Array.from(part.text, () => part.offset));
            }
        }
        const last = parts.at(-1);
        map.push(last instanceof Segment ? last.map.at(-1) : last.offset);
        return new Segment(text, map);
    }

    /**
     * Map an edit of the segment text to an edit of the source text.
     */
    toSource(edit) {
        return { start: this.map[edit.start], end: this.map[edit.end], text: edit.text };
    }

    /**
     * Source offset of a segment offset.
     */
    offset(index) {
        return this.map[Math.min(index, this.map.length - 1)];
    }
}

const SIMPLE_ESCAPES = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", v: "\v", 0: "\0" };

/**
 * Decode the raw content of a JavaScript string literal or template literal quasi into a segment.
 *
 * @param {string} raw literal content without quotes
 * @param {number} offset source offset of the content
 */
export function decodeJsString(raw, offset) {
    let text = "";
    const map = [];
    let index = 0;
    while (index < raw.length) {
        const start = index;
        if (raw[index] !== "\\") {
            text += raw[index++];
            map.push(offset + start);
            continue;
        }
        const next = raw[index + 1];
        if (next === "\r" && raw[index + 2] === "\n") {
            index += 3;
            continue;
        }
        if (next === "\n" || next === "\r" || next === " " || next === " ") {
            index += 2;
            continue;
        }
        let char;
        if (next === "x") {
            char = String.fromCharCode(parseInt(raw.slice(index + 2, index + 4), 16));
            index += 4;
        } else if (next === "u" && raw[index + 2] === "{") {
            const end = raw.indexOf("}", index);
            char = String.fromCodePoint(parseInt(raw.slice(index + 3, end), 16));
            index = end + 1;
        } else if (next === "u") {
            char = String.fromCharCode(parseInt(raw.slice(index + 2, index + 6), 16));
            index += 6;
        } else {
            char = SIMPLE_ESCAPES[next] ?? next;
            index += 2;
        }
        for (const unit of char) {
            text += unit;
            map.push(offset + start);
        }
    }
    map.push(offset + raw.length);
    return new Segment(text, map);
}

/**
 * Line and column (both 1-based) of a source offset.
 */
export function position(source, offset) {
    let line = 1;
    let lineStart = 0;
    for (let index = source.indexOf("\n"); index !== -1 && index < offset; index = source.indexOf("\n", index + 1)) {
        line++;
        lineStart = index + 1;
    }
    return { line, column: offset - lineStart + 1 };
}

/**
 * Split text into whitespace separated tokens with their offsets.
 */
export function tokenize(text) {
    return Array.from(text.matchAll(/\S+/g), (match) => ({ text: match[0], start: match.index, end: match.index + match[0].length }));
}
