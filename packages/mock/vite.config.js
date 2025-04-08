import { customPreamble, indexReplace, legacyResolve } from '@wrensecurity/commons-ui-build/vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from "vite";

const ALIAS_CONFIG = {
    Footer: "org/forgerock/mock/ui/common/components/Footer",
    ThemeManager: "org/forgerock/mock/ui/common/util/ThemeManager",
    LoginView: "org/forgerock/commons/ui/common/LoginView",
    UserProfileView: "org/forgerock/commons/ui/user/profile/UserProfileView",
    ForgotUsernameView: "org/forgerock/commons/ui/user/anonymousProcess/ForgotUsernameView",
    PasswordResetView: "org/forgerock/commons/ui/user/anonymousProcess/PasswordResetView",
    LoginDialog: "org/forgerock/commons/ui/common/LoginDialog",
    RegisterView: "org/forgerock/commons/ui/user/anonymousProcess/SelfRegistrationView",
    NavigationFilter : "org/forgerock/commons/ui/common/components/navigation/filters/RoleFilter",
    KBADelegate: "org/forgerock/commons/ui/user/delegates/KBADelegate"
};

const VENDOR_CONFIG = {
    // sinon only needed (or available) for Mock project
    sinon: "/libs/sinon.js",
    i18next: "/libs/i18next.js",
    backbone: "/libs/backbone.js",
    "backbone.paginator": "/libs/backbone.paginator.js",
    "backbone-relational": "/libs/backbone-relational.js",
    backgrid: "/libs/backgrid.js",
    "backgrid-filter": "/libs/backgrid-filter.js",
    "backgrid-paginator": "/libs/backgrid-paginator.js",
    selectize: "/libs/selectize.js",
    underscore: "/libs/underscore.js",
    lodash: "/libs/lodash.js",
    js2form: "/libs/js2form.js",
    form2js: "/libs/form2js.js",
    spin: "/libs/spin.js",
    jquery: "/libs/jquery.js",
    xdate: "/libs/xdate.js",
    doTimeout: "/libs/jquery.ba-dotimeout.js",
    handlebars: "/libs/handlebars.js",
    moment: "/libs/moment.js",
    bootstrap: "/libs/bootstrap.js",
    "bootstrap-dialog": "/libs/bootstrap-dialog.js",
    placeholder: "/libs/jquery.placeholder.js"
};

const GLOBALS_CONFIG = {
    sinon: "sinon",
    backbone: "Backbone",
    backgrid: "Backgrid",
    js2form: "js2form",
    form2js: "form2js",
    spin: "spin",
    doTimeout: "doTimeout",
    moment: "moment",
    xdate: "xdate",
};

const PREAMBLE_CONFIG = {
    backbone: ["underscore"],
    "backbone.paginator": ["backbone"],
    backgrid: ["jquery", "underscore", "backbone"],
    "backgrid-filter": ["backgrid"],
    "backgrid-paginator": ["backgrid", "backbone.paginator"],
    bootstrap: ["jquery"],
    "bootstrap-dialog": ["jquery", "underscore","backbone", "bootstrap"],
    placeholder: ["jquery"],
    selectize: ["jquery"],
    doTimeout: ["jquery"],
};

const EXTERNAL_CONFIG = [
    ...Object.keys(VENDOR_CONFIG),
    // Excluded from optimization so that the UI can be customized without having to repackage it.
    "config/AppConfiguration",
    // Exclude mock project dependencies to create a more representative bundle.
    "mock/Data",
];

const IMPORTMAP_CONFIG = {
    imports: {
        ...VENDOR_CONFIG,
        "config/AppConfiguration": "/config/AppConfiguration.js",
        // Data.js
        "org/forgerock/commons/ui/common/main/Configuration": "/org/forgerock/commons/ui/common/main/Configuration.js",
        "org/forgerock/mock/ui/common/main/LocalStorage": "/org/forgerock/mock/ui/common/main/LocalStorage.js"
    }
};

export default defineConfig({
    root: resolve(fileURLToPath(new URL("./build/www", import.meta.url))),
    resolve: {
        alias: ALIAS_CONFIG
    },
    plugins: [
        indexReplace({
            replace: {
                "__IMPORTMAP_CONFIG__": JSON.stringify(IMPORTMAP_CONFIG, null, "  ")
            }
        })
    ],
    build: {
        outDir: "",
        rollupOptions: {
            external: EXTERNAL_CONFIG,
            output: {
                assetFileNames: "[name].[ext]",
                entryFileNames: "[name].js",
                chunkFileNames: "[name].js",
                globals: GLOBALS_CONFIG,
                paths: id => {
                    return VENDOR_CONFIG[id] ??  `/${id}.js`;
                },
            },
            plugins: [
                ...Object.entries(PREAMBLE_CONFIG).map(([key, value]) => {
                    return customPreamble({
                        include: ALIAS_CONFIG[key] || key,
                        content: value
                            .map(id => `import "${ALIAS_CONFIG[id] || id}";`).join("\n"),
                    });
                }),
                legacyResolve({
                    include: /^((!?org|libs|config)\/.*)$/
                }),
            ]
        }
    }
});
