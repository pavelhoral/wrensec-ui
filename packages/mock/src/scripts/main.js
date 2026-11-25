/**
 * The contents of this file are subject to the terms of the Common Development and
 * Distribution License (the License). You may not use this file except in compliance with the
 * License.
 *
 * You can obtain a copy of the License at legal/CDDLv1.0.txt. See the License for the
 * specific language governing permission and limitations under the License.
 *
 * When distributing Covered Software, include this CDDL Header Notice in each file and include
 * the License file at legal/CDDLv1.0.txt. If applicable, add the following below the CDDL
 * Header, with the fields enclosed by brackets [] replaced by your own identifying
 * information: "Portions copyright [year] [name of copyright owner]".
 *
 * Copyright 2011-2016 ForgeRock AS.
 * Portions Copyright 2018-2026 Wren Security.
 */

require.config({
    map: {
        "*" : {
            "Footer": "org/forgerock/mock/ui/common/components/Footer",
            "ThemeManager": "org/forgerock/mock/ui/common/util/ThemeManager",
            "LoginView": "org/forgerock/commons/ui/common/LoginView",
            "UserProfileView": "org/forgerock/commons/ui/user/profile/UserProfileView",
            "ForgotUsernameView": "org/forgerock/commons/ui/user/anonymousProcess/ForgotUsernameView",
            "PasswordResetView": "org/forgerock/commons/ui/user/anonymousProcess/PasswordResetView",
            "LoginDialog": "org/forgerock/commons/ui/common/LoginDialog",
            "RegisterView": "org/forgerock/commons/ui/user/anonymousProcess/SelfRegistrationView",
            "NavigationFilter" : "org/forgerock/commons/ui/common/components/navigation/filters/RoleFilter",
            "KBADelegate": "org/forgerock/commons/ui/user/delegates/KBADelegate"
        }
    },
    paths: {
        // nise (fake server) only needed (or available) for Mock project
        nise: "libs/nise",
        // React is provided by the application (used by the React example view)
        react: "libs/react",
        "react-dom": "libs/react-dom",
        i18next: "libs/i18next",
        backbone: "libs/backbone",
        "backbone.paginator": "libs/backbone.paginator",
        "backbone-relational": "libs/backbone-relational",
        "backgrid": "libs/backgrid",
        "backgrid-filter": "libs/backgrid-filter",
        "backgrid-paginator": "libs/backgrid-paginator",
        selectize: "libs/selectize",
        underscore: "libs/underscore",
        lodash: "libs/lodash",
        js2form: "libs/js2form",
        form2js: "libs/form2js",
        jquery: "libs/jquery",
        xdate: "libs/xdate",
        handlebars: "libs/handlebars",
        moment: "libs/moment",
        bootstrap: "libs/bootstrap"
    },

    shim: {
        lodash: {
            exports: ""
        },
        backbone: {
            deps: ["underscore"],
            exports: "Backbone"
        },
        "backbone.paginator": {
            deps: ["backbone"]
        },
        "backgrid": {
            deps: ["jquery", "underscore", "backbone"],
            exports: "Backgrid"
        },
        "backgrid-filter": {
            deps: ["backgrid"]
        },
        "backgrid-paginator": {
            deps: ["backgrid", "backbone.paginator"]
        },
        js2form: {
            exports: "js2form"
        },
        form2js: {
            exports: "form2js"
        },
        selectize: {
            deps: ["jquery"]
        },
        xdate: {
            exports: "xdate"
        },
        moment: {
            exports: "moment"
        }
    }
});

require([
    // This list should be all of the things that you either need to use to initialize
    // prior to starting, or should be the modules that you want included in the minified
    // startup bundle. Be sure to only put things in this list that you really need to have
    // loaded on startup (so that you get the benefit of minification without adding more
    // than you really need for the first load)

    // These are used prior to initialization. Note that the callback function names
    // these as arguments, but ignores the others.
    "org/forgerock/commons/ui/common/main/EventManager",
    "org/forgerock/commons/ui/common/util/Constants",
    "org/forgerock/commons/ui/common/util/CookieHelper",
    "org/forgerock/mock/ui/common/main/LocalStorage",

    // core forgerock-ui files
    "org/forgerock/commons/ui/common/main",

    // files that are necessary for rendering the login page for forgerock-ui-mock
    "org/forgerock/mock/ui/main",
    "config/main",

    // libraries necessary for forgerock-ui (and thus worth bundling)
    "jquery",
    "underscore",
    "lodash",
    "backbone",
    "handlebars",
    "i18next"
], function (EventManager, Constants, CookieHelper, LocalStorage) {

    // Mock project is run without server. Framework requires cookies to be enabled in order to be able to login.
    // Default CookieHelper.cookiesEnabled() implementation will always return false as cookies cannot be set from local
    // file. Hence redefining function to return true
    CookieHelper.cookiesEnabled = function () {
        return true;
    };

    // Adding stub user
    LocalStorage.add('mock/repo/internal/user/test', {
        _id: 'test',
        _rev: '1',
        component: 'mock/repo/internal/user',
        roles: ['ui-user','ui-self-service-user'],
        uid: 'test',
        userName: 'test',
        password: 'test',
        telephoneNumber: '12345',
        givenName: 'Jack',
        sn: 'White',
        mail: 'white@test.com',
        kbaInfo:[{
            "customQuestion":"What is my favorite open source identity company?",
            "answer": {
                "$crypto": {
                    "value": {
                        "algorithm": "SHA-256",
                        "data": "LbOwzJnSKtSn2waBA/6Zv8AFaTwe74vHh9dyPaBOVnZFTCU/MsNWTfmbRcx2PM4d"
                    },
                    "type": "salted-hash"
                }
            }
        }, {
            "questionId":"1",
            "answer": {
                "$crypto": {
                    "value": {
                        "algorithm": "SHA-256",
                        "data": "ht5QecQ11l4mnCBxa8TKRU7KZhhMrD6SSTxv1XJkbEUlRjGhw5Ss5WMC4diBgNme"
                    },
                    "type": "salted-hash"
                }
            }
        }]
    });

    EventManager.sendEvent(Constants.EVENT_DEPENDENCIES_LOADED);
});
