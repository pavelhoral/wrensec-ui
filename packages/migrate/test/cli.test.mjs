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
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

const BIN = join(import.meta.dirname, "..", "bin", "wrensec-ui-migrate.mjs");

describe("cli", () => {
    let directory;

    const run = (...args) => spawnSync(process.execPath, [BIN, ...args], { cwd: directory, encoding: "utf8" });

    beforeEach(() => {
        directory = mkdtempSync(join(tmpdir(), "wrensec-ui-migrate-"));
        mkdirSync(join(directory, "src", "node_modules"), { recursive: true });
        writeFileSync(join(directory, "src", "page.html"), "<div class=\"panel panel-default\"></div>\n");
        writeFileSync(join(directory, "src", "node_modules", "skipped.html"), "<div class=\"panel\"></div>\n");
        writeFileSync(join(directory, "src", "styles.less"), "@import \"titatoggle.css\";\n.a { color: @base-theme-color; }\n");
        writeFileSync(join(directory, "gulpfile.js"), "useLessStyles();\n");
    });

    afterEach(() => {
        rmSync(directory, { recursive: true, force: true });
    });

    it("prints usage without a command", () => {
        const result = run();
        assert.equal(result.status, 1);
        assert.match(result.stderr, /Usage: wrensec-ui-migrate/);
    });

    it("prints a dry run without changing files", () => {
        const result = run("bootstrap5", "src");
        assert.equal(result.status, 0);
        assert.match(result.stdout, /^-<div class="panel panel-default"><\/div>$/m);
        assert.match(result.stdout, /^\+<div class="card"><\/div>$/m);
        assert.match(result.stdout, /1 file\(s\) to change/);
        assert.equal(readFileSync(join(directory, "src", "page.html"), "utf8"), "<div class=\"panel panel-default\"></div>\n");
    });

    it("writes the changes", () => {
        const result = run("bootstrap5", "--write", "src");
        assert.equal(result.status, 0);
        assert.equal(readFileSync(join(directory, "src", "page.html"), "utf8"), "<div class=\"card\"></div>\n");
        assert.equal(readFileSync(join(directory, "src", "node_modules", "skipped.html"), "utf8"), "<div class=\"panel\"></div>\n");
    });

    it("converts Less files to SCSS files", () => {
        const result = run("scss", "--write", "src");
        assert.equal(result.status, 0);
        assert.equal(existsSync(join(directory, "src", "styles.less")), false);
        assert.equal(readFileSync(join(directory, "src", "styles.scss"), "utf8"),
            ".a { color: var(--wrensec-base-theme-color); }\n");
        assert.match(result.stdout, /src\/styles\.less\n\s+1:1\s+removed-import/);
        assert.match(result.stdout, /gulpfile\.js\n\s+1:1\s+gulpfile/);
    });

    it("prints JSON", () => {
        const result = run("bootstrap5", "--json", "src");
        const output = JSON.parse(result.stdout);
        assert.deepEqual(output.changes.map((change) => change.file), ["src/page.html"]);
        assert.deepEqual(output.reports, []);
    });
});
