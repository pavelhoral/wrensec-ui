import { Command } from "commander";
import FastGlob from "fast-glob";
import jcs from "jscodeshift";
import { readFile, writeFile } from "node:fs/promises";

const program = new Command();

program
    .name("migrate")
    .description("Tools to assist with AMD-to-ESM migration");

program
    .command("dynamic")
    .description("Convert AMD module loading to dynamic imports")
    .argument("<pattern>", "Glob pattern to match files")
    .action(async (pattern) => {
        for (const filename of await FastGlob(pattern)) {
            const sourceCode = await readFile(filename, "utf-8");
            const parsedCode = jcs(sourceCode);
            parsedCode.find(jcs.CallExpression, { callee: { name: "define" } }).replaceWith(path => {
                const defineCall = path.node;
                const promiseCall = jcs.callExpression(
                    jcs.memberExpression(jcs.identifier("Promise"), jcs.identifier("resolve")),
                    [defineCall.arguments[0]],
                )
                const fulfillCall = jcs.callExpression(
                    jcs.memberExpression(promiseCall, jcs.identifier("then")),
                    [defineCall.arguments[1]],
                );
                return fulfillCall;
            });
            await writeFile(filename, parsedCode.toSource(), "utf-8");
        }
    });

program.parse();
