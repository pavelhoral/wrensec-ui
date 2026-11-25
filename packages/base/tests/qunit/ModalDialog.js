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

define([
    "jquery",
    "org/forgerock/commons/ui/common/components/ModalDialog"
], function ($, ModalDialog) {
    var created;

    /** Create a dialog without animation, so that it is shown and hidden synchronously. */
    function create (options) {
        var dialog = new ModalDialog($.extend({ animate: false }, options));
        created.push(dialog);
        return dialog;
    }

    function show (options) {
        var dialog = create(options);
        dialog.show();
        return dialog;
    }

    function isShown (dialog) {
        return dialog.$el.hasClass("show") && $.contains(document.body, dialog.element);
    }

    /** Bootstrap uses native event listeners, so native events are dispatched. */
    function pressEscape (dialog) {
        dialog.element.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    }

    function clickBackdrop (dialog) {
        dialog.element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        dialog.element.click();
    }

    QUnit.module("ModalDialog", {
        beforeEach: function () {
            created = [];
        },
        afterEach: function () {
            created.reverse().forEach(function (dialog) {
                dialog.hide();
            });
            $(".modal-backdrop").remove();
            $(document.body).removeClass("modal-open").css({ "overflow": "", "padding-right": "" });
        }
    });

    QUnit.test("renders Bootstrap modal markup", function (assert) {
        var dialog = show({
                id: "testDialog",
                className: "custom-class",
                title: "<b>Title</b>",
                body: "<p class='message'>Message</p>",
                variant: "danger",
                size: "lg",
                scrollable: true,
                centered: true
            }),
            $title = dialog.$el.find(".modal-header > .modal-title");

        assert.ok(isShown(dialog), "dialog is shown");
        assert.ok(dialog.$el.is("#testDialog.modal.custom-class"), "dialog element");
        assert.notOk(dialog.$el.hasClass("fade"), "no fade class without animation");
        assert.ok(dialog.$el.find(".modal-dialog").is(".modal-lg.modal-dialog-scrollable.modal-dialog-centered"),
            "dialog size and position");
        assert.equal($title.text(), "<b>Title</b>", "title string is text");
        assert.ok($title.hasClass("text-danger"), "title color by variant");
        assert.equal(dialog.$el.attr("aria-labelledby"), $title.attr("id"), "dialog labelled by its title");
        assert.equal(dialog.$body.find(".message").text(), "Message", "body string is HTML");
        assert.equal(dialog.$el.find(".modal-header > .btn-close[data-bs-dismiss=modal]").length, 1, "close button");
        assert.equal(dialog.$el.find(".modal-footer").length, 0, "no footer without buttons");
        assert.ok($(document.body).hasClass("modal-open"), "page is in modal mode");
    });

    QUnit.test("renders title and body elements", function (assert) {
        var dialog = show({ title: $("<span class='title'>Title</span>"), body: $("<p class='body'>Body</p>") });

        assert.equal(dialog.$el.find(".modal-title > .title").length, 1, "title element");
        assert.equal(dialog.$body.children(".body").length, 1, "body element");
        assert.ok(/^wrensec-modal-\d+$/.test(dialog.element.id), "generated identifier");
        assert.notOk(dialog.$el.find(".modal-title").is("[class*=text-]"), "no title color without variant");
        assert.notOk(dialog.$el.find(".modal-dialog").is("[class*=modal-sm], [class*=modal-lg]"), "default size");
    });

    QUnit.test("renders and handles buttons", function (assert) {
        var clicked = [],
            dialog = show({
                buttons: [{
                    id: "btnAction",
                    label: "<i>Action</i>",
                    className: "btn-primary",
                    action: function (dialogRef, event) {
                        clicked.push([this.id, dialogRef === dialog, event.type]);
                    }
                }, {
                    id: "btnDisabled",
                    label: "Disabled",
                    disabled: true
                }, {
                    id: "btnClose",
                    label: "Close",
                    autofocus: true
                }]
            }),
            $action = dialog.getButton("btnAction");

        assert.ok($action.is(".modal-footer > button.btn.btn-primary[type=button]"), "button with class");
        assert.equal($action.text(), "<i>Action</i>", "button label is text");
        assert.ok(dialog.getButton("btnDisabled").is(".btn-outline-secondary:disabled"), "default class, disabled");
        assert.ok(dialog.getButton("btnClose").is(document.activeElement), "autofocus button focused");
        assert.equal(dialog.getButton("missing").length, 0, "unknown button");

        $action.trigger("click");
        assert.deepEqual(clicked, [["btnAction", true, "click"]], "action called with the button and the dialog");
        assert.ok(isShown(dialog), "action does not hide the dialog");

        dialog.getButton("btnClose").trigger("click");
        assert.notOk(isShown(dialog), "button without action hides the dialog");
    });

    QUnit.test("shows and hides with promises and events", function (assert) {
        var events = [],
            dialog = create({ id: "lifecycle" });

        dialog.$el.on("show.bs.modal shown.bs.modal hide.bs.modal hidden.bs.modal", function (event) {
            events.push(event.type);
        });
        return dialog.show().then(function (shown) {
            assert.strictEqual(shown, true, "show resolved");
            assert.ok(isShown(dialog), "dialog is shown");
            return dialog.hide();
        }).then(function () {
            assert.deepEqual(events, ["show", "shown", "hide", "hidden"], "Bootstrap events triggered");
            assert.equal($("#lifecycle").length, 0, "hidden dialog is removed from the page");
            assert.notOk($(document.body).hasClass("modal-open"), "page is not in modal mode");
            return dialog.show().then(function () {
                assert.ok(false, "hidden dialog cannot be shown again");
            }, function () {
                assert.ok(true, "hidden dialog cannot be shown again");
            });
        });
    });

    QUnit.test("allows event handlers to prevent showing and hiding", function (assert) {
        var prevented = create({ id: "prevented" }),
            guarded = show({ id: "guarded" }),
            allowHide = false;

        prevented.$el.on("show.bs.modal", function (event) {
            event.preventDefault();
        });
        guarded.$el.on("hide.bs.modal", function (event) {
            if (!allowHide) {
                event.preventDefault();
            }
        });

        guarded.hide();
        assert.ok(isShown(guarded), "hiding prevented");
        allowHide = true;
        guarded.hide();
        assert.notOk(isShown(guarded), "dialog hidden");

        return prevented.show().then(function (shown) {
            assert.strictEqual(shown, false, "show resolved as prevented");
            assert.notOk(isShown(prevented), "dialog is not shown");
        });
    });

    QUnit.test("is dismissed by keyboard and backdrop when closable", function (assert) {
        var closable = show({ id: "closable", body: "<p class='message'>Message</p>" }),
            fixed = show({ id: "fixed", closable: false });

        assert.equal(fixed.$el.find(".btn-close").length, 0, "no close button when not closable");
        pressEscape(fixed);
        clickBackdrop(fixed);
        assert.ok(isShown(fixed), "not closable dialog stays shown");
        fixed.hide();
        assert.notOk(isShown(fixed), "not closable dialog hidden programmatically");

        closable.$body.find(".message").trigger("click");
        assert.ok(isShown(closable), "click inside the dialog does not hide it");
        pressEscape(closable);
        assert.notOk(isShown(closable), "escape hides the dialog");

        closable = show();
        clickBackdrop(closable);
        assert.notOk(isShown(closable), "backdrop click hides the dialog");

        closable = show();
        closable.$el.find(".btn-close").trigger("click");
        assert.notOk(isShown(closable), "close button hides the dialog");
    });

    QUnit.test("stacks dialogs", function (assert) {
        var first = show({ id: "first" }),
            second = show({ id: "second" }),
            $backdrops = $(".modal-backdrop");

        assert.equal(first.$el.css("z-index"), "1055", "first dialog z-index");
        assert.equal(second.$el.css("z-index"), "1075", "second dialog z-index");
        assert.equal($backdrops.length, 2, "backdrop for each dialog");
        assert.equal($backdrops.last().css("z-index"), "1070", "second backdrop between the dialogs");

        assert.ok(second.$el.is(document.activeElement), "top dialog is focused");
        pressEscape(second);
        assert.notOk(isShown(second), "escape hides the top dialog");
        assert.ok(isShown(first), "previous dialog stays shown");
        assert.ok($(document.body).hasClass("modal-open"), "page stays in modal mode with remaining dialog");
        assert.ok(first.$el.is(document.activeElement), "remaining dialog is focused");

        first.hide();
        assert.notOk($(document.body).hasClass("modal-open"), "page leaves modal mode");
    });

    QUnit.test("hides dialog hidden while it is being shown", function (assert) {
        var order = [],
            dialog = new ModalDialog({ id: "fastHide" }),
            shown = dialog.show().then(function () {
                order.push("shown");
            }),
            hidden = dialog.hide().then(function () {
                order.push("hidden");
            });

        return Promise.all([shown, hidden]).then(function () {
            assert.deepEqual(order, ["shown", "hidden"], "dialog hidden once it is shown");
            assert.notOk(isShown(dialog), "dialog is hidden");
        });
    });

    QUnit.test("confirms", function (assert) {
        // Confirmation dialogs are animated, the choice is made once each is shown
        function confirm (choose, options) {
            $(document).one("shown.bs.modal", function (event) {
                choose($(event.target));
            });
            return ModalDialog.confirm($.extend({ title: "Delete", body: "Sure?", variant: "danger" }, options));
        }

        return confirm(function ($dialog) {
            var $buttons = $dialog.find(".modal-footer > .btn");
            assert.equal($buttons.length, 2, "cancel and confirm buttons");
            assert.ok($buttons.eq(0).hasClass("btn-outline-secondary"), "cancel button");
            assert.ok($buttons.eq(1).hasClass("btn-danger"), "confirm button by variant");
            assert.ok($dialog.find(".modal-title").hasClass("text-danger"), "title color by variant");
            $buttons.eq(1).trigger("click");
        }).then(function (result) {
            assert.strictEqual(result, true, "confirmed");
            return confirm(function ($dialog) {
                $dialog.find(".modal-footer > .btn").eq(0).trigger("click");
            });
        }).then(function (result) {
            assert.strictEqual(result, false, "cancelled");
            return confirm(function ($dialog) {
                $dialog.find(".btn-close").trigger("click");
            });
        }).then(function (result) {
            assert.strictEqual(result, false, "dismissed");
            return confirm(function ($dialog) {
                var $buttons = $dialog.find(".modal-footer > .btn");
                assert.equal($buttons.eq(0).text(), "Keep", "cancel label");
                assert.equal($buttons.eq(1).text(), "Remove", "confirm label");
                assert.ok($buttons.eq(1).hasClass("btn-warning"), "confirm button class");
                $buttons.eq(1).trigger("click");
            }, { confirmLabel: "Remove", cancelLabel: "Keep", confirmClassName: "btn-warning" });
        }).then(function (result) {
            assert.strictEqual(result, true, "confirmed with custom buttons");
        });
    });
});
