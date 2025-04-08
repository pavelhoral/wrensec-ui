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
 * Portions Copyright 2018 Wren Security.
 */
// This list should be all of the things that you either need to use to initialize
// prior to starting, or should be the modules that you want included in the minified
// startup bundle. Be sure to only put things in this list that you really need to have
// loaded on startup (so that you get the benefit of minification without adding more
// than you really need for the first load)

// These are used prior to initialization. Note that the callback function names
// these as arguments, but ignores the others.
import "org/forgerock/commons/ui/common/main/EventManager";

import "org/forgerock/commons/ui/common/util/Constants";
import "org/forgerock/commons/ui/common/util/CookieHelper";
import "org/forgerock/mock/ui/common/main/LocalStorage";

// core forgerock-ui files
import "org/forgerock/commons/ui/common/main";

// files that are necessary for rendering the login page for forgerock-ui-mock
import "org/forgerock/mock/ui/main";

import "config/main";

// libraries necessary for forgerock-ui (and thus worth bundling)
import "jquery";

import "underscore";
import "lodash";
import "backbone";
import "handlebars";
import "i18next";
import "spin";

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
