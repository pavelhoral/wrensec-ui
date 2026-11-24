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

import $ from "jquery";
import "selectize";
import PageableCollection from "backbone.paginator";
import "backgrid-filter";
import AbstractView from "org/forgerock/commons/ui/common/main/AbstractView";
import Backgrid from "org/forgerock/commons/ui/common/backgrid/Backgrid";
import "org/forgerock/commons/ui/common/backgrid/extension/ThemeablePaginator";
import "org/forgerock/commons/ui/common/backgrid/extension/ThemeableServerSideFilter";
import Messages from "org/forgerock/commons/ui/common/components/Messages";
import ModalDialog from "org/forgerock/commons/ui/common/components/ModalDialog";
import SpinnerManager from "org/forgerock/commons/ui/common/main/SpinnerManager";
import ValidatorsManager from "org/forgerock/commons/ui/common/main/ValidatorsManager";
import UIUtils from "org/forgerock/commons/ui/common/util/UIUtils";
import CodeMirror from "org/forgerock/mock/ui/examples/CodeMirror";

const DIALOG_SIZES = {
    sm: "Small dialog",
    lg: "Large dialog",
    xl: "Extra large dialog"
};

const MESSAGES = {
    success: "Changes have been saved.",
    info: "There is something new.",
    warning: "Something may need your attention.",
    error: "Something went wrong."
};

/**
 * @param {string} code code example as written in the template
 * @returns {string} code without surrounding empty lines and common indentation
 */
const formatCode = (code) => {
    const lines = code.replace(/^\s*\n|\s+$/g, "").split("\n");
    const indent = Math.min(...lines.filter((line) => line.trim()).map((line) => line.match(/^ */)[0].length));
    return lines.map((line) => line.slice(indent)).join("\n");
};

const closeButton = () => ({ label: $.t("common.form.close") });

/**
 * Live examples of commons components (dialogs, notifications, validation, Selectize, backgrid and spinner).
 */
const ComponentsView = AbstractView.extend({
    template: "templates/mock/ComponentsTemplate.html",
    events: {
        "click [data-dialog-variant]": "showVariantDialog",
        "click [data-dialog-size]": "showSizeDialog",
        "click #dialogStackedExample": "showStackedDialog",
        "click #dialogConfirmExample": "showConfirmation",
        "click #confirmDialogExample": "showConfirmDialog",
        "click [data-message-type]": "showMessage",
        "click #spinnerExample": "showSpinner"
    },

    render (args, callback) {
        this.parentRender(() => {
            this.$el.find(".code").each((index, element) => {
                const code = formatCode($(element).text());
                $(element).empty();
                CodeMirror(element, { value: code, mode: "javascript", lineNumbers: true, readOnly: true });
            });
            ValidatorsManager.bindValidators(this.$el.find("#validationExample"));
            this.$el.find("#selectizeExample").selectize({ create: true });
            this.$el.find("#selectizePillExample").selectize({ create: true, maxItems: 3 });
            this.renderGrid();
            if (callback) {
                callback();
            }
        });
    },

    renderGrid () {
        const users = Array.from({ length: 42 }, (value, index) => ({
            id: index + 1,
            userName: `user${String(index + 1).padStart(2, "0")}`,
            mail: `user${index + 1}@example.com`,
            active: index % 3 !== 0
        }));
        const collection = new (PageableCollection.extend({ mode: "client", state: { pageSize: 8 } }))(users);
        const grid = new Backgrid.Grid({
            className: "backgrid table",
            collection,
            columns: [
                { name: "id", label: "ID", cell: "integer", editable: false },
                { name: "userName", label: "Username", cell: "string", editable: false },
                { name: "mail", label: "Email", cell: "string", editable: false },
                { name: "active", label: "Active", cell: "boolean", editable: false }
            ]
        });
        const paginator = new Backgrid.Extension.ThemeablePaginator({ collection, windowSize: 3 });
        // Client side filter with the markup of the commons server side filter
        const filter = new (Backgrid.Extension.ClientSideFilter.extend({
            className: Backgrid.Extension.ThemeableServerSideFilter.prototype.className,
            template: Backgrid.Extension.ThemeableServerSideFilter.prototype.template
        }))({ collection, fields: ["userName", "mail"], placeholder: "Filter users" });

        this.$el.find("#backgridExample").append(filter.render().el, grid.render().el, paginator.render().el);
    },

    showVariantDialog (event) {
        const variant = $(event.currentTarget).data("dialogVariant") || null;
        ModalDialog.show({
            variant,
            title: variant ? "Danger dialog" : "Default dialog",
            body: $("<p>").text(variant ? "Dialog of danger variant." : "Dialog without variant."),
            buttons: [closeButton()]
        });
    },

    showSizeDialog (event) {
        const size = $(event.currentTarget).data("dialogSize");
        ModalDialog.show({
            size,
            title: DIALOG_SIZES[size],
            body: $("<p>").text(`Dialog of ${size} size.`),
            buttons: [closeButton()]
        });
    },

    showStackedDialog () {
        ModalDialog.show({
            title: "First dialog",
            body: $("<p>").text("Dialogs can be shown on top of each other."),
            buttons: [{
                label: "Show another dialog",
                className: "btn-primary",
                action: () => ModalDialog.show({
                    title: "Second dialog",
                    body: $("<p>").text("Hiding this dialog returns to the first one."),
                    buttons: [closeButton()]
                })
            }, closeButton()]
        });
    },

    showConfirmation () {
        ModalDialog.confirm({
            title: "Delete",
            body: "Do you really want to delete it?",
            variant: "danger",
            confirmLabel: $.t("common.form.delete")
        }).then((confirmed) => Messages.addMessage({
            type: confirmed ? Messages.TYPE_SUCCESS : Messages.TYPE_INFO,
            message: confirmed ? "Confirmed." : "Cancelled."
        }));
    },

    showConfirmDialog () {
        UIUtils.confirmDialog("Do you really want to do it?", "default", () => Messages.addMessage({
            type: Messages.TYPE_SUCCESS,
            message: "Confirmed."
        }));
    },

    showMessage (event) {
        const type = $(event.currentTarget).data("messageType");
        Messages.addMessage({ type, message: MESSAGES[type] });
    },

    showSpinner () {
        SpinnerManager.showSpinner();
        setTimeout(() => SpinnerManager.hideSpinner(), 2000);
    }
});

export default new ComponentsView();
