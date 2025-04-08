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
 */

import $ from "jquery";
import _ from "lodash";
import BootstrapDialog from "org/forgerock/commons/ui/common/components/BootstrapDialog";
import UIUtils from "org/forgerock/commons/ui/common/util/UIUtils";
import Configuration from "org/forgerock/commons/ui/common/main/Configuration";
import Constants from "org/forgerock/commons/ui/common/util/Constants";
import EventManager from "org/forgerock/commons/ui/common/main/EventManager";
import SessionManager from "org/forgerock/commons/ui/common/main/SessionManager";
import AbstractView from "org/forgerock/commons/ui/common/main/AbstractView";

var LoginDialog = AbstractView.extend({
    template: "templates/common/LoginDialog.html",
    element: "#dialogs",

    render: function (options) {
        var dialogBody = $('<div id="loginDialog"></div>'),
            authenticatedCallback = options.authenticatedCallback;

        this.$el.find('#dialogs').append(dialogBody);
        // attaching BootstrapDialog via '#dialogs' so that it is encapsulated withing the qunit-fixture for testing
        this.setElement(dialogBody);
        BootstrapDialog.show({
            closable: false,
            title:  $.t("common.form.sessionExpired"),
            type: BootstrapDialog.TYPE_DEFAULT,
            message: dialogBody,
            onshown: _.bind(function () {
                UIUtils.renderTemplate(
                    this.template,
                    this.$el,
                    _.extend({}, Configuration.globalData, this.data),
                    _.noop,
                    "replace");
            }, this),
            buttons: [{
                id: "loginDialogSubmitButton",
                label: $.t("common.user.login"),
                cssClass: "btn-primary",
                hotkey: 13,
                action: function(dialog) {
                    var userName,
                        password;

                    userName = dialog.$modalBody.find("input[name=login]").val();
                    password = dialog.$modalBody.find("input[name=password]").val();

                    SessionManager.login({"userName":userName, "password":password}, function(user) {
                        Configuration.setProperty('loggedUser', user);
                        EventManager.sendEvent(Constants.EVENT_AUTHENTICATION_DATA_CHANGED, {
                            anonymousMode: false
                        });
                        EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, "loggedIn");
                        dialog.close();

                        if (authenticatedCallback) {
                            authenticatedCallback();
                        }
                    }, function() {
                        EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, "authenticationFailed");
                    });
                }
            }]
        });
    }
});
export default new LoginDialog();
