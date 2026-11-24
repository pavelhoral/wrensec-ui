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
 * Portions Copyright 2026 Wren Security.
 */

define([
    "jquery",
    "lodash",
    "org/forgerock/commons/ui/common/components/ModalDialog",
    "org/forgerock/commons/ui/common/util/UIUtils",
    "org/forgerock/commons/ui/common/main/Configuration",
    "org/forgerock/commons/ui/common/util/Constants",
    "org/forgerock/commons/ui/common/main/EventManager",
    "org/forgerock/commons/ui/common/main/SessionManager",
    "org/forgerock/commons/ui/common/main/AbstractView"
], function($, _, ModalDialog, UIUtils, Configuration, Constants, EventManager, SessionManager, AbstractView) {
    var LoginDialog = AbstractView.extend({
        template: "templates/common/LoginDialog.html",
        events: {
            "submit form": "login",
            "keydown input": "loginOnEnter"
        },

        /**
         * Show the login dialog (it can be closed only by logging in).
         * @param {Object} [options] dialog options
         * @param {function} [options.authenticatedCallback] called when the user is logged in
         */
        render: function (options) {
            this.authenticatedCallback = options && options.authenticatedCallback;
            this.dialog = new ModalDialog({
                closable: false,
                title: $.t("common.form.sessionExpired"),
                buttons: [{
                    id: "loginDialogSubmitButton",
                    label: $.t("common.user.login"),
                    className: "btn-primary",
                    action: _.bind(function (dialog, event) {
                        this.login(event);
                    }, this)
                }]
            });
            this.setElement(this.dialog.$body);
            UIUtils.renderTemplate(this.template, this.$el, _.extend({}, Configuration.globalData, this.data),
                _.bind(function () {
                    this.dialog.show();
                }, this));
        },

        close: function () {
            if (this.dialog) {
                this.dialog.hide();
            }
        },

        loginOnEnter: function (event) {
            if (event.key === "Enter") {
                this.login(event);
            }
        },

        login: function (event) {
            var dialog = this.dialog,
                authenticatedCallback = this.authenticatedCallback;

            if (event) {
                event.preventDefault();
            }
            SessionManager.login({
                "userName": this.$el.find("input[name=login]").val(),
                "password": this.$el.find("input[name=password]").val()
            }, function (user) {
                Configuration.setProperty("loggedUser", user);
                EventManager.sendEvent(Constants.EVENT_AUTHENTICATION_DATA_CHANGED, {
                    anonymousMode: false
                });
                EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, "loggedIn");
                dialog.hide();

                if (authenticatedCallback) {
                    authenticatedCallback();
                }
            }, function () {
                EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, "authenticationFailed");
            });
        }
    });
    return new LoginDialog();
});
