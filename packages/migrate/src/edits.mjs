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
import MagicString from "magic-string";

/**
 * Apply edits ({ start, end, text }) to the source by their original offsets, keeping all other text as it is.
 * Insertions (start === end) next to a replaced range join its replacement, so they are kept when the range is
 * removed; insertions at the same offset keep their order.
 */
export function applyEdits(source, edits) {
    const replacements = edits.filter((edit) => edit.start !== edit.end).map((edit) => ({ ...edit }))
        .sort((first, second) => first.start - second.start);
    const insertions = [];
    for (const edit of edits.filter((item) => item.start === item.end)) {
        const before = replacements.find((replacement) => replacement.start === edit.start);
        const after = replacements.findLast((replacement) => replacement.end === edit.start);
        if (before) {
            before.prefix = (before.prefix ?? "") + edit.text;
        } else if (after) {
            after.text += edit.text;
        } else {
            insertions.push(edit);
        }
    }
    const result = new MagicString(source);
    let end = 0;
    for (const edit of replacements) {
        if (edit.start < end) {
            throw new Error(`Overlapping edits at offset ${edit.start}`);
        }
        const text = (edit.prefix ?? "") + edit.text;
        if (text) {
            result.overwrite(edit.start, edit.end, text);
        } else {
            result.remove(edit.start, edit.end);
        }
        end = edit.end;
    }
    for (const edit of insertions) {
        result.appendLeft(edit.start, edit.text);
    }
    return result.toString();
}
