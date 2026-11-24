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
    useBuildModule
} = require("@wrensecurity/commons-ui-build");
const gulp = require("gulp");

// Font Awesome font files, loaded by the commons Font Awesome styles from css/fontawesome/webfonts
const FONTAWESOME_WEBFONTS = ["fa-brands-400", "fa-regular-400", "fa-solid-900", "fa-v4compatibility"];

const MODULE_RESOURCES = {
    ...Object.fromEntries(FONTAWESOME_WEBFONTS.map((font) => [
        `@fortawesome/fontawesome-free/webfonts/${font}.woff2`,
        `css/fontawesome/webfonts/${font}.woff2`
    ])),
    "@selectize/selectize/dist/css/selectize.bootstrap5.css": "css/selectize.css",
    "@selectize/selectize/dist/js/selectize.min.js": "libs/selectize.js",
    "backbone-relational/backbone-relational.js": "libs/backbone-relational.js",
    "backbone.paginator/lib/backbone.paginator.min.js": "libs/backbone.paginator.js",
    "backbone/backbone-min.js": "libs/backbone.js",
    "backgrid-filter/backgrid-filter.css": "css/backgrid-filter.css",
    "backgrid-filter/backgrid-filter.min.js": "libs/backgrid-filter.js",
    "backgrid-paginator/backgrid-paginator.min.css": "css/backgrid-paginator.css",
    "backgrid-paginator/backgrid-paginator.min.js": "libs/backgrid-paginator.js",
    "backgrid-select-all/backgrid-select-all.min.js": "libs/backgrid-select-all.js",
    "backgrid/lib/backgrid.min.css": "css/backgrid.css",
    "backgrid/lib/backgrid.min.js": "libs/backgrid.js",
    "dragula/dist/dragula.min.js": "libs/dragula.js",
    "form2js/src/form2js.js": "libs/form2js.js",
    "form2js/src/js2form.js": "libs/js2form.js",
    "handlebars/dist/handlebars.js": "libs/handlebars.js",
    "jquery/dist/jquery.min.js": "libs/jquery.js",
    "lodash": "libs/lodash.js",
    "moment/min/moment.min.js": "libs/moment.js",
    "requirejs/require.js": "libs/requirejs.js",
    "underscore/underscore-umd.js": "libs/underscore.js",
    "xdate/src/xdate.js": "libs/xdate.js"
};

gulp.task("eslint", useEslint({ src: "src/scripts/**/*.{js,jsm}" }));

gulp.task("build:assets", useLocalResources({ "src/assets/**": "" }));

gulp.task("build:scripts", useLocalResources({ "src/scripts/**": "" }));

// New components are ES modules that have to be transpiled to AMD modules for RequireJS (and its optimizer)
gulp.task("build:modules", useBuildScripts({
    src: "src/scripts/**/*.jsm",
    dest: "dist"
}));

gulp.task("build:libs", async () => {
    await useModuleResources(MODULE_RESOURCES, { path: __filename })();
    await useBuildModule({
        id: "i18next",
        src: "src/modules/i18next.mjs",
        dest: "dist/libs/i18next.js",
        transpile: true
    })();
    // Bootstrap with Popper, transpiled so that the RequireJS optimizer is able to parse it
    await useBuildModule({
        id: "bootstrap",
        src: "src/modules/bootstrap.mjs",
        dest: "dist/libs/bootstrap.js",
        external: ["jquery"],
        transpile: true,
        minify: true
    })();
});

gulp.task("build", gulp.series(
    gulp.parallel(
        "build:assets",
        "build:scripts",
        "build:modules"
    ),
    "build:libs"
));

gulp.task("watch", () => {
    gulp.watch("src/scripts/**", gulp.parallel("build:scripts", "build:modules"));
});

gulp.task("default", gulp.series("eslint", "build"));
