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
 * Copyright 2023-2026 Wren Security.
 */
const {
    useBuildScripts,
    useEslint,
    useLocalResources,
    useModuleResources,
    useScssStyles,
    useBuildRequire,
    useBuildModule
} = require("@wrensecurity/commons-ui-build");
const gulp = require("gulp");
const { runQunitPuppeteer, printResultSummary, printFailedTests } = require("node-qunit-puppeteer");
const { join } = require("path");
const { pathToFileURL } = require("url");

// XXX There is a missing functionality of watch/sync on parent projects that
// was intentionally dropped when migrating from Grunt to Gulp... this will be
// addressed later on when needed.

const TARGET_PATH = "build/www";
const TESTS_PATH = "build/test";

const MODULE_RESOURCES = {
    "qunit": "libs/qunit.js",
    "qunit/qunit/qunit.css": "css/qunit.css",
    "react/umd/react.production.min.js": "libs/react.js",
    "react-dom/umd/react-dom.production.min.js": "libs/react-dom.js",
    "sinon/pkg/sinon.js": "libs/sinon.js"
};

const TEST_RESOURCES = {
    "tests/qunit/**": "",
    "../base/tests/qunit/**": "tests/commons/",
    "../user/tests/qunit/**": "tests/user/"
};

gulp.task("eslint", useEslint({ src: "src/scripts/**/*.{js,jsm}" }));

gulp.task("build:assets", useLocalResources({ "src/assets/**": "" }, { dest: TARGET_PATH }));

gulp.task("build:scripts", useLocalResources({ "src/scripts/**": "" }, { dest: TARGET_PATH }));

// New components are ES modules that have to be transpiled to AMD modules for RequireJS (and its optimizer)
gulp.task("build:modules", useBuildScripts({
    // CodeMirror example is bundled separately by build:editor
    src: ["src/scripts/**/*.jsm", "!src/scripts/org/forgerock/mock/ui/examples/CodeMirror.jsm"],
    dest: TARGET_PATH
}));

gulp.task("build:compose", useLocalResources({ "../user/dist/**": "" }, { dest: TARGET_PATH }));

gulp.task("build:libs", useModuleResources(MODULE_RESOURCES, { path: __filename, dest: TARGET_PATH }));

gulp.task("build:styles", useScssStyles({
    "src/styles/main.scss": "css/main.css"
}, { base: join(TARGET_PATH, "css"), dest: TARGET_PATH }));

gulp.task("build:editor", useBuildModule({
    id: "org/forgerock/mock/ui/examples/CodeMirror",
    src: "src/scripts/org/forgerock/mock/ui/examples/CodeMirror.jsm",
    dest: join(TARGET_PATH, "org/forgerock/mock/ui/examples/CodeMirror.js")
}));

gulp.task("build:bundle", useBuildRequire({
    base: "build/www",
    dest: "build/www/main.js",
    exclude: [
        // Excluded from optimization so that the UI can be customized without having to repackage it.
        "config/AppConfiguration",
        // Exclude mock project dependencies to create a more representative bundle.
        "mock/Data",
        "nise"
    ]
}));

gulp.task("test:scripts", useLocalResources(TEST_RESOURCES, { dest: TESTS_PATH }));

gulp.task("test:nise", useBuildScripts({
    src: require.resolve("nise/nise.js"),
    dest: join(TARGET_PATH, "libs"),
    plugins: []
}));

gulp.task("test:qunit", async () => {
    const result = await runQunitPuppeteer({
        targetUrl: pathToFileURL(join(TESTS_PATH, "index.html")).href,
        puppeteerArgs: [
            "--allow-file-access-from-files",
            "--no-sandbox"
        ]
    });
    printResultSummary(result, console);
    if (result.stats.failed > 0) {
        printFailedTests(result, console);
        throw new Error(`QUnit tests failed (${result.stats.failed} failed assertions)`);
    }
});

gulp.task("build", gulp.series(
    gulp.parallel(
        "build:assets",
        "build:scripts",
        "build:modules",
        "build:compose",
        "build:editor",
        "build:libs",
        "test:nise"
    ),
    gulp.parallel(
        "build:styles",
        "build:bundle"
    )
));

gulp.task("test", gulp.series(
    "test:scripts",
    "test:qunit"
));

gulp.task("watch", () => {
    gulp.watch("src/scripts/**", { ignoreInitial: false }, gulp.parallel("build:scripts", "build:modules"));
    gulp.watch("../user/dist/**", { ignoreInitial: false }, gulp.parallel("build:compose"));
});

gulp.task("default", gulp.series("build", "test"));
