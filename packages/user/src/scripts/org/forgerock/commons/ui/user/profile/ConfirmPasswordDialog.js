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
 * Copyright 2015-2016 ForgeRock AS.
 * Portions Copyright 2026 Wren Security.
 */

define([
    "jquery",
    "lodash",
    "org/forgerock/commons/ui/common/main/AbstractView",
    "org/forgerock/commons/ui/common/components/ModalDialog",
    "org/forgerock/commons/ui/common/util/UIUtils",
    "org/forgerock/commons/ui/common/main/ValidatorsManager"
], function($, _, AbstractView, ModalDialog, UIUtils, ValidatorsManager) {
    var ConfirmPasswordDialog = AbstractView.extend({
        template: "templates/user/ConfirmPasswordDialogTemplate.html",
        events: {
            "submit #confirmPasswordForm": "submitForm",
            "change #currentPassword": "validateForm",
            "keyup #currentPassword": "validateForm"
        },
        errorsHandlers: {
            "Bad Request": { status: "400" }
        },

        /**
         * Ask the user for the current password.
         * @param {string[]} changedProtected names of the changed protected attributes
         * @param {function} completedCallback called with the entered password
         */
        render: function (changedProtected, completedCallback) {
            this.data = { changedProtected: changedProtected };
            this.completedCallback = completedCallback;
            this.dialog = new ModalDialog({
                title: $.t("common.user.confirmPassword"),
                buttons: [{
                    id: "btnUpdate",
                    label: $.t("common.form.update"),
                    className: "btn-primary",
                    disabled: true,
                    action: _.bind(function () {
                        this.submitForm();
                    }, this)
                }]
            });
            this.setElement(this.dialog.$el);
            UIUtils.renderTemplate(this.template, this.dialog.$body, this.data, _.bind(function () {
                ValidatorsManager.bindValidators(this.$el);
                this.dialog.show();
            }, this));
        },

        submitForm: function (event) {
            if (event) {
                event.preventDefault();
            }
            if (this.completedCallback) {
                this.completedCallback(this.$el.find("#currentPassword").val());
            }
            this.dialog.hide();
        },

        validateForm: function () {
            this.dialog.getButton("btnUpdate").prop("disabled", this.$el.find("#currentPassword").val().length === 0);
        }
    });

    return new ConfirmPasswordDialog();
});
