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
import { createTwoFilesPatch } from "diff";
import { existsSync } from "node:fs";
import { readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import { EXTENSIONS as BOOTSTRAP5_EXTENSIONS, migrateBootstrap5 } from "./bootstrap5/index.mjs";
import { EXTENSIONS as SCSS_EXTENSIONS, convertLess, scssPath } from "./scss/index.mjs";
import { position } from "./text.mjs";

const USAGE = `Usage: wrensec-ui-migrate <command> [--write] [--json] <paths...>

Migrates Wren Security UI applications to commons 24.0. Run the commands in this order:

  scss        convert Less styles (*.less) to SCSS modules (*.scss)
  bootstrap5  rename Bootstrap 3 classes and data attributes in templates (*.html, *.hbs),
              scripts (*.js, *.mjs, *.jsm, *.jsx) and styles (*.scss, *.less, *.css)

Paths are files or directories (node_modules, target, libs, build and dist are skipped).
Without --write, the command prints the changes as unified diffs (a dry run). Both commands
report what they can't convert, with the file, line and Bootstrap 5 replacement.

Options:
  --write  write the changes (review them with git diff)
  --json   print the changes and the report as JSON
  --help   print this help
`;

const SKIPPED_DIRECTORIES = new Set(["node_modules", "target", "libs", "build", "dist", ".git"]);

/** Files with the given extensions under the given paths, sorted. */
export async function collectFiles(paths, extensions) {
    const files = new Set();
    const visit = async (path) => {
        const info = await stat(path);
        if (info.isDirectory()) {
            for (const entry of await readdir(path, { withFileTypes: true })) {
                if (!(entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name))) {
                    await visit(join(path, entry.name));
                }
            }
        } else if (extensions.includes(extname(path).toLowerCase())) {
            files.add(resolve(path));
        }
    };
    for (const path of paths) {
        await visit(path);
    }
    return Array.from(files).sort();
}

/** Relative path for output. */
const display = (path) => relative(process.cwd(), path).split(sep).join("/") || ".";

/** Reports of the gulpfile in the working directory (useLessStyles is replaced by useScssStyles). */
async function gulpfileReports() {
    const path = resolve("gulpfile.js");
    if (!existsSync(path)) {
        return [];
    }
    const source = await readFile(path, "utf8");
    return Array.from(source.matchAll(/useLessStyles/g), (match) => ({
        path, source, offset: match.index, rule: "gulpfile", text: "useLessStyles",
        message: "build the converted styles with useScssStyles (entry files *.scss, base path for common/* modules)"
    }));
}

/**
 * Run a command.
 *
 * @returns {Promise<{ changes: object[], reports: object[] }>} changed files ({ path, newPath, source, output })
 *          and reports ({ path, source, offset, rule, text, message })
 */
export async function run(command, paths, { write = false } = {}) {
    const changes = [];
    const reports = [];
    if (command === "scss") {
        const files = await collectFiles(paths, SCSS_EXTENSIONS);
        const inputs = await Promise.all(files.map(async (path) => ({ path, source: await readFile(path, "utf8") })));
        const results = convertLess(inputs);
        for (const result of results) {
            const input = inputs.find((item) => item.path === result.path);
            reports.push(...result.reports.map((report) => ({ ...report, path: result.path, source: input.source })));
            if (result.output !== null) {
                const newPath = scssPath(result.path);
                if (existsSync(newPath)) {
                    reports.push({ path: result.path, source: input.source, offset: 0, rule: "exists", text: "",
                        message: `${display(newPath)} exists already, the file was not converted` });
                } else {
                    changes.push({ path: result.path, newPath, source: input.source, output: result.output });
                }
            }
        }
        reports.push(...await gulpfileReports());
    } else if (command === "bootstrap5") {
        for (const path of await collectFiles(paths, BOOTSTRAP5_EXTENSIONS)) {
            const source = await readFile(path, "utf8");
            const result = migrateBootstrap5(path, source);
            reports.push(...result.reports.map((report) => ({ ...report, path, source })));
            if (result.output !== source) {
                changes.push({ path, newPath: path, source, output: result.output });
            }
        }
    } else {
        throw new Error(`Unknown command: ${command}`);
    }

    if (write) {
        for (const change of changes) {
            await writeFile(change.newPath, change.output);
            if (change.newPath !== change.path) {
                await rm(change.path);
            }
        }
    }
    return { changes, reports };
}

/** Reports with line and column, sorted by file and position. */
function locate(reports) {
    return reports.map((report) => ({ file: display(report.path), ...position(report.source, report.offset),
        rule: report.rule, text: report.text, message: report.message, offset: report.offset }))
        .sort((first, second) => first.file.localeCompare(second.file) || first.offset - second.offset)
        .map((report) => ({ file: report.file, line: report.line, column: report.column, rule: report.rule,
            text: report.text, message: report.message }));
}

/** Format the report for the terminal. */
function formatReport(reports) {
    const lines = [];
    let file = null;
    for (const report of reports) {
        if (report.file !== file) {
            file = report.file;
            lines.push("", file);
        }
        const text = report.text ? `${report.text.replace(/\s+/g, " ").slice(0, 60)} → ` : "";
        lines.push(`  ${`${report.line}:${report.column}`.padEnd(9)} ${report.rule.padEnd(22)} ${text}${report.message}`);
    }
    return lines.join("\n");
}

/** Command line entry point. */
export async function main(argv) {
    let parsed;
    try {
        parsed = parseArgs({
            args: argv,
            allowPositionals: true,
            options: {
                write: { type: "boolean", "default": false },
                json: { type: "boolean", "default": false },
                help: { type: "boolean", "short": "h", "default": false }
            }
        });
    } catch (error) {
        process.stderr.write(`${error.message}\n\n${USAGE}`);
        return 1;
    }
    const [command, ...paths] = parsed.positionals;
    if (parsed.values.help) {
        process.stdout.write(USAGE);
        return 0;
    }
    if (!["scss", "bootstrap5"].includes(command) || !paths.length) {
        process.stderr.write(USAGE);
        return 1;
    }

    const { changes, reports } = await run(command, paths, { write: parsed.values.write });
    const located = locate(reports);
    if (parsed.values.json) {
        process.stdout.write(`${JSON.stringify({
            command,
            write: parsed.values.write,
            changes: changes.map((change) => ({
                file: display(change.path),
                newFile: display(change.newPath),
                diff: createTwoFilesPatch(display(change.path), display(change.newPath), change.source, change.output)
            })),
            reports: located
        }, null, 2)}\n`);
        return 0;
    }

    if (!parsed.values.write) {
        for (const change of changes) {
            process.stdout.write(createTwoFilesPatch(`a/${display(change.path)}`, `b/${display(change.newPath)}`,
                change.source, change.output, "", "", { context: 2 }).replace(/^=+\n/, ""));
        }
    }
    if (located.length) {
        process.stdout.write(`\nNot converted (fix by hand):${formatReport(located)}\n`);
    }
    const verb = parsed.values.write ? "changed" : "to change";
    process.stdout.write(`\n${changes.length} file(s) ${verb}, ${located.length} item(s) reported.`
        + `${parsed.values.write || !changes.length ? "" : " Run with --write to apply the changes."}\n`);
    return 0;
}
