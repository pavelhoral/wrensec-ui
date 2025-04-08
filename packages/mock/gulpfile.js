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
 * Copyright 2023 Wren Security.
 */
import {
    useBuildScripts,
    useEslint,
    useLocalResources,
    useModuleResources,
    useLessStyles,
    useBuildModule
} from "@wrensecurity/commons-ui-build/gulp";
import gulp from "gulp";
import { createRequire } from "module";
import { runQunitPuppeteer, printResultSummary } from "node-qunit-puppeteer";
import { join } from "path";
import { pathToFileURL } from "url";
import { build } from "vite";

// XXX There is a missing functionality of watch/sync on parent projects that
// was intentionally dropped when migrating from Grunt to Gulp... this will be
// addressed later on when needed.

const TARGET_PATH = "build/www";
const TESTS_PATH = "build/test";

const MODULE_RESOURCES = {
    "qunit/qunit/qunit.js": "libs/qunit.js",
    "qunit/qunit/qunit.css": "css/qunit.css"
};

const TEST_RESOURCES = {
    "tests/qunit/**": "",
    "../base/tests/qunit/**": "tests/commons/",
    "../user/tests/qunit/**": "tests/user/"
};

gulp.task("eslint", useEslint());

gulp.task("build:assets", useLocalResources({ "src/assets/**": "" }, { dest: TARGET_PATH }));

gulp.task("build:scripts", useLocalResources({ "src/scripts/**": "" }, { dest: TARGET_PATH }));

gulp.task("build:compose", useLocalResources({ "../user/dist/**": "" }, { dest: TARGET_PATH }));

gulp.task("build:libs", useModuleResources(MODULE_RESOURCES, { dest: TARGET_PATH }));

gulp.task("build:styles", useLessStyles({
    "build/www/css/structure.less": "css/structure.css",
    "build/www/css/theme.less": "css/theme.css"
}, { base: join(TARGET_PATH, "css"), dest: TARGET_PATH }));

gulp.task("build:editor", useBuildModule({
    id: "org/forgerock/mock/ui/examples/CodeMirror",
    src: "src/scripts/org/forgerock/mock/ui/examples/CodeMirror.jsm",
    dest: join(TARGET_PATH, "org/forgerock/mock/ui/examples/CodeMirror.js")
}));

gulp.task("build:bundle", async () => {
    await build();
});

gulp.task("test:scripts", useLocalResources(TEST_RESOURCES, { dest: TESTS_PATH }));

gulp.task("test:sinon", useBuildScripts({
    // src: require.resolve("sinon/pkg/sinon.js"),
    src: createRequire(import.meta.url).resolve("sinon/pkg/sinon.js"),
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
});

gulp.task("build", gulp.series(
    gulp.parallel(
        "build:assets",
        "build:scripts",
        "build:compose",
        "build:editor",
        "build:libs",
        "test:sinon"
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
    gulp.watch("src/scripts/**", { ignoreInitial: false }, gulp.parallel("build:scripts"));
    gulp.watch("../user/dist/**", { ignoreInitial: false }, gulp.parallel("build:compose"));
});

gulp.task("default", gulp.series("build"/*, "test"*/));
