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
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { describe, it } from "node:test";
import * as sass from "sass";
import { convertLess, scssPath } from "../src/scss/index.mjs";
import { position } from "../src/text.mjs";

const FIXTURES = join(import.meta.dirname, "fixtures", "scss");
const COMMONS_STYLES = join(import.meta.dirname, "..", "..", "base", "src", "assets", "css");
const BUILD_PACKAGE = join(import.meta.dirname, "..", "..", "build");

/** Read Less files of a fixture input directory. */
function readInputs(directory) {
    return readdirSync(directory, { recursive: true }).filter((name) => name.endsWith(".less")).sort()
        .map((name) => ({ path: join(directory, name), source: readFileSync(join(directory, name), "utf8") }));
}

/** Reports as "file line:column rule". */
function formatReports(inputs, results, directory) {
    return results.flatMap((result) => {
        const { source } = inputs.find((input) => input.path === result.path);
        return result.reports.map((report) => ({ ...position(source, report.offset), rule: report.rule }))
            .sort((first, second) => first.line - second.line || first.column - second.column)
            .map((report) => `${relative(directory, result.path)} ${report.line}:${report.column} ${report.rule}`);
    });
}

describe("scss", () => {
    for (const fixture of readdirSync(FIXTURES)) {
        const input = join(FIXTURES, fixture, "input");
        const expected = join(FIXTURES, fixture, "expected");

        it(`converts ${fixture}`, () => {
            const inputs = readInputs(input);
            const results = convertLess(inputs);
            for (const result of results) {
                const target = join(expected, relative(input, scssPath(result.path)));
                assert.equal(result.output, readFileSync(target, "utf8"), relative(input, result.path));
            }
            const reports = readFileSync(join(FIXTURES, fixture, "reports.txt"), "utf8").split("\n").filter(Boolean);
            assert.deepEqual(formatReports(inputs, results, input), reports);
        });
    }

    it("output compiles with the commons modules", () => {
        const directory = mkdtempSync(join(tmpdir(), "wrensec-ui-migrate-"));
        try {
            const input = join(FIXTURES, "compiles", "input");
            for (const result of convertLess(readInputs(input))) {
                const target = join(directory, relative(input, scssPath(result.path)));
                mkdirSync(dirname(target), { recursive: true });
                writeFileSync(target, result.output);
            }
            const { css } = sass.compile(join(directory, "styles.scss"), {
                loadPaths: [directory, COMMONS_STYLES],
                importers: [new sass.NodePackageImporter(BUILD_PACKAGE)]
            });
            assert.match(css, /\.box \.label/);
            assert.match(css, /border-color: var\(--wrensec-base-theme-color-dark\)/);
            assert.match(css, /\.nested \.inner/);
        } finally {
            rmSync(directory, { recursive: true, force: true });
        }
    });
});
