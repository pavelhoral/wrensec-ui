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
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { migrateBootstrap5 } from "../src/bootstrap5/index.mjs";
import { position } from "../src/text.mjs";

const FIXTURES = join(import.meta.dirname, "fixtures", "bootstrap5");

/** Reports as "line:column rule" sorted by position. */
function formatReports(source, reports) {
    return reports.map((report) => ({ ...position(source, report.offset), rule: report.rule }))
        .sort((first, second) => first.line - second.line || first.column - second.column)
        .map((report) => `${report.line}:${report.column} ${report.rule}`);
}

describe("bootstrap5", () => {
    for (const input of readdirSync(FIXTURES).filter((name) => name.includes(".input."))) {
        const name = input.replace(".input.", ".");
        const source = readFileSync(join(FIXTURES, input), "utf8");
        const expected = readFileSync(join(FIXTURES, input.replace(".input.", ".output.")), "utf8");
        const reports = readFileSync(join(FIXTURES, input.replace(/\.input\.\w+$/, ".reports.txt")), "utf8")
            .split("\n").filter(Boolean);

        it(`migrates ${name}`, () => {
            const result = migrateBootstrap5(name, source);
            assert.equal(result.output, expected);
            assert.deepEqual(formatReports(source, result.reports), reports);
        });

        it(`changes nothing in migrated ${name}`, () => {
            assert.equal(migrateBootstrap5(name, expected).output, expected);
        });
    }

    it("reports a minified Bootstrap 3 build", () => {
        const result = migrateBootstrap5("bootstrap.min.css", "/*! Bootstrap v3.4.1 */.col-xs-1{float:left}");
        assert.equal(result.output, "/*! Bootstrap v3.4.1 */.col-xs-1{float:left}");
        assert.deepEqual(result.reports.map((report) => report.rule), ["bootstrap3-build"]);
    });

    it("reports scripts that can't be parsed", () => {
        const result = migrateBootstrap5("broken.js", "$(\".panel\").addClass(");
        assert.deepEqual(result.reports.map((report) => report.rule), ["parse-error"]);
    });
});
