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
import { spawnSync } from "child_process";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";

const TARGET_PATH = fileURLToPath(new URL("../dist", import.meta.url));
mkdirSync(TARGET_PATH, { recursive: true });

const result = spawnSync("npm", ["pack", "--pack-destination", TARGET_PATH], { stdio: "inherit", shell: process.platform === "win32" });
process.exitCode = result.status ?? 1;
