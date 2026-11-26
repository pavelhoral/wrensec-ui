import globals from "globals";
import wrensecurityConfig from "@wrensecurity/eslint-config";

export default [
    { ignores: ["dist/", "test/fixtures/"] },
    wrensecurityConfig,
    {
        languageOptions: {
            globals: {
                ...globals.node
            },
            sourceType: "module",
            ecmaVersion: 2024
        }
    }
];
