import { describe, expect, it } from "vitest";
import { rollup } from "rollup";
import { customPreamble } from '../src/vite';

describe('rollup.js', () => {

    describe("customPreamble", () => {

        async function process(
            input,
            /** @type {import('../src/vite').CustomPreambleOptions} */ options
        ) {
            const bundle = await rollup({
                input: `test/fixtures/${input}`,
                plugins: [customPreamble(options)]
            });
            const { output } = await bundle.generate({});
            return output[0].code;
        }

        it("should add custom preamble", async () => {
            const result = await process("simple.js", {
                content: "FOOBAR"
            });
            expect(result).toBe([
                "FOOBAR;",
                "console.log(\"HELLO WORLD\");",
                ""
            ].join("\n"));
        });

    });

});
