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
    useEslint,
    useLocalResources
} from "@wrensecurity/commons-ui-build/gulp";
import gulp from "gulp";

gulp.task("eslint", useEslint());

gulp.task("build:assets", useLocalResources({ "src/assets/**": "" }));

gulp.task("build:scripts", useLocalResources({ "src/scripts/**": "" }));

gulp.task("build:compose", useLocalResources({ "../base/dist/**": "" }));

gulp.task("build", gulp.parallel("build:assets", "build:scripts", "build:compose"));

gulp.task("watch", () => {
    gulp.watch("src/scripts/**", gulp.parallel("build:scripts"));
    gulp.watch("../base/dist/**", gulp.parallel("build:compose"));
});

gulp.task("default", gulp.series("eslint", "build"));
