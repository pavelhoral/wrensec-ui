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
    "org/forgerock/commons/ui/common/components/ModalDialog",
    "org/forgerock/commons/ui/common/components/BootstrapDialog"
], function ($, ModalDialog, BootstrapDialog) {
    var opened;

    /** Open a dialog without animation, so that it is shown and hidden synchronously. */
    function show (options) {
        var dialog = ModalDialog.show($.extend({ animate: false }, options));
        opened.push(dialog);
        return dialog;
    }

    function keyup (dialog, which) {
        dialog.$modal.trigger($.Event("keyup", { which: which }));
    }

    /** Bootstrap uses native event listeners, so native events are dispatched. */
    function pressEscape (dialog) {
        dialog.$modal[0].dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    }

    function clickBackdrop (dialog) {
        dialog.$modal[0].dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        dialog.$modal[0].click();
    }

    QUnit.module("ModalDialog", {
        beforeEach: function () {
            opened = [];
        },
        afterEach: function () {
            opened.reverse().forEach(function (dialog) {
                dialog.close();
            });
            $(".modal-backdrop").remove();
            $(document.body).removeClass("modal-open");
        }
    });

    QUnit.test("renders bootstrap-dialog markup", function (assert) {
        var dialog = show({
            id: "testDialog",
            title: "Title",
            message: "Line 1\nLine 2",
            type: ModalDialog.TYPE_DANGER,
            size: ModalDialog.SIZE_WIDE,
            cssClass: "custom-class",
            description: "testDescription"
        });

        assert.ok(dialog.isRealized(), "dialog is realized");
        assert.ok(dialog.isOpened(), "dialog is opened");
        assert.equal($("#testDialog").length, 1, "dialog is attached to the page");
        assert.ok(dialog.$modal.is(".modal.bootstrap-dialog.type-danger.size-wide.custom-class"), "dialog classes");
        assert.notOk(dialog.$modal.hasClass("fade"), "no fade class without animation");
        assert.equal(dialog.$modal.attr("aria-labelledby"), "testDialog_title", "labelled by title");
        assert.equal(dialog.$modal.attr("aria-describedby"), "testDescription", "described by description");
        assert.equal(dialog.$modal.attr("tabindex"), "-1", "default tabindex");
        assert.ok(dialog.getModalDialog().hasClass("modal-lg"), "wide dialog is large modal");
        assert.equal(dialog.$modal.find("#testDialog_title.bootstrap-dialog-title").text(), "Title", "title");
        assert.equal(dialog.$modal.find(".bootstrap-dialog-message").html(), "Line 1<br>Line 2",
            "new lines converted to line breaks");
        assert.ok(dialog.$modal.find(".bootstrap-dialog-close-button").is(":visible"), "close button is visible");
        assert.notOk(dialog.getModalFooter().is(":visible"), "footer without buttons is hidden");
        assert.equal(dialog.getModalFooter().find(".bootstrap-dialog-footer-buttons").length, 0,
            "no buttons container without buttons");
        assert.ok($(document.body).hasClass("modal-open"), "page is in modal mode");
    });

    QUnit.test("renders default title, function and jQuery content", function (assert) {
        var dialog = show({
                type: ModalDialog.TYPE_WARNING,
                message: function (dialog) {
                    return $("<p class='fn-message'></p>").text(dialog.getData("text"));
                },
                data: { text: "From data" },
                nl2br: false
            }),
            plain = show({ title: "a\nb", nl2br: false });

        assert.equal(dialog.$modal.find(".bootstrap-dialog-title").text(), "Warning", "default title by type");
        assert.equal(dialog.$modal.find(".bootstrap-dialog-message .fn-message").text(), "From data",
            "message function called with the dialog");
        assert.equal(plain.$modal.find(".bootstrap-dialog-title").html(), "a\nb", "new lines kept without nl2br");
        assert.ok(/^wrensec-dialog-\d+$/.test(plain.getId()), "generated identifier");
    });

    QUnit.test("copies options and provides data", function (assert) {
        var options = { data: { key: "value" } },
            dialog = new ModalDialog(options);

        dialog.setData("key", "changed");
        assert.equal(dialog.getData("key"), "changed", "data changed");
        assert.equal(options.data.key, "value", "original options are not modified");
        assert.notOk(dialog.isRealized(), "dialog is not realized before opening");
    });

    QUnit.test("renders and handles buttons", function (assert) {
        var clicked = [],
            dialog = show({
                size: ModalDialog.SIZE_LARGE,
                buttons: [{
                    id: "btnIcon",
                    label: "With icon",
                    icon: "fa fa-check",
                    cssClass: "btn-primary",
                    hotkey: 13,
                    action: function (dialogRef, event) {
                        clicked.push([this.attr("id"), dialogRef === dialog, event.type]);
                    }
                }, {
                    label: "Small",
                    cssClass: "btn-default btn-sm"
                }]
            }),
            $button = dialog.getButton("btnIcon"),
            $small = dialog.$modalFooter.find("button").eq(1);

        assert.ok(dialog.getModalFooter().is(":visible"), "footer with buttons is visible");
        assert.ok($button.is("button.btn.btn-primary.btn-lg"), "button classes with size class of large dialog");
        assert.equal($button.find(".bootstrap-dialog-button-icon.fa.fa-check").length, 1, "button icon");
        assert.equal($button.text(), "With icon", "button label");
        assert.ok($small.is(".btn-sm") && !$small.hasClass("btn-lg"), "explicit button size is kept");
        assert.ok(/^wrensec-dialog-button-\d+$/.test($small.attr("id")), "generated button identifier");
        assert.strictEqual(dialog.getButton("missing"), null, "unknown button");

        $button.trigger("click");
        assert.deepEqual(clicked, [["btnIcon", true, "click"]], "action called with the button and the dialog");

        keyup(dialog, 13);
        assert.equal(clicked.length, 2, "hotkey clicks the button");

        $button.disable();
        assert.ok($button.prop("disabled") && $button.hasClass("disabled"), "button disabled");
        keyup(dialog, 13);
        assert.equal(clicked.length, 2, "hotkey ignores disabled button");

        $button.enable();
        assert.notOk($button.prop("disabled") || $button.hasClass("disabled"), "button enabled");

        dialog.enableButtons(false);
        assert.equal(dialog.$modalFooter.find("button:disabled").length, 2, "all buttons disabled");
    });

    QUnit.test("calls lifecycle callbacks", function (assert) {
        var calls = [],
            track = function (name) {
                return function (dialog) {
                    calls.push(name + ":" + dialog.isOpened() + ":" + (this.id === "lifecycle"));
                };
            },
            dialog = show({
                id: "lifecycle",
                onshow: track("onshow"),
                onshown: track("onshown"),
                onhide: track("onhide"),
                onhidden: track("onhidden")
            });

        dialog.close();
        assert.deepEqual(calls, [
            "onshow:true:true",
            "onshown:true:true",
            "onhide:false:true",
            "onhidden:false:true"
        ], "callbacks called in order with the dialog and options as context");
        assert.equal($("#lifecycle").length, 0, "closed dialog is removed");
        assert.notOk($(document.body).hasClass("modal-open"), "page is not in modal mode");
    });

    QUnit.test("allows callbacks to cancel showing and hiding", function (assert) {
        var allowHide = false,
            cancelled = show({ id: "cancelled", onshow: function () { return false; } }),
            dialog = show({ id: "guarded", onhide: function () { return allowHide; } });

        assert.notOk(cancelled.isOpened(), "showing cancelled");
        assert.notOk(cancelled.$modal.is(":visible"), "cancelled dialog is not visible");

        dialog.close();
        assert.ok(dialog.isOpened(), "hiding cancelled");
        assert.equal($("#guarded").length, 1, "dialog is kept");

        allowHide = true;
        dialog.close();
        assert.notOk(dialog.isOpened(), "dialog closed");
        assert.equal($("#guarded").length, 0, "dialog removed");
    });

    QUnit.test("closes by keyboard and backdrop when closable", function (assert) {
        var closable = show({ id: "closable" }),
            fixed = show({ id: "fixed", closable: false });

        assert.notOk(fixed.$modal.find(".bootstrap-dialog-close-button").is(":visible"), "close button hidden");
        pressEscape(fixed);
        clickBackdrop(fixed);
        assert.ok(fixed.isOpened(), "not closable dialog stays opened");
        assert.notOk(fixed.$modal.hasClass("modal-static"), "not closable dialog is not animated");
        fixed.close();
        assert.notOk(fixed.isOpened(), "not closable dialog closed programmatically");

        closable.$modal.find(".bootstrap-dialog-message").trigger("click");
        assert.ok(closable.isOpened(), "click inside the dialog does not close it");
        pressEscape(closable);
        assert.notOk(closable.isOpened(), "escape closes the dialog");

        closable = show({ id: "closable" });
        clickBackdrop(closable);
        assert.notOk(closable.isOpened(), "backdrop click closes the dialog");

        closable = show({ id: "closable" });
        closable.$modal.find(".bootstrap-dialog-close-button").trigger("click");
        assert.notOk(closable.isOpened(), "close button closes the dialog");
    });

    QUnit.test("stacks dialogs", function (assert) {
        var first = show({ id: "first" }),
            second = show({ id: "second" }),
            $backdrops = $(".modal-backdrop");

        assert.equal(first.$modal.css("z-index"), "1055", "first dialog z-index");
        assert.equal(second.$modal.css("z-index"), "1075", "second dialog z-index");
        assert.equal($backdrops.length, 2, "backdrop for each dialog");
        assert.equal($backdrops.last().css("z-index"), "1070", "second backdrop between the dialogs");

        assert.ok(second.$modal.is(document.activeElement), "top dialog is focused");
        pressEscape(second);
        assert.notOk(second.isOpened(), "escape closes the top dialog");
        assert.ok(first.isOpened(), "previous dialog stays opened");
        assert.ok($(document.body).hasClass("modal-open"), "page stays in modal mode with remaining dialog");
        assert.ok(first.$modal.is(document.activeElement), "remaining dialog is focused");

        first.close();
        assert.notOk($(document.body).hasClass("modal-open"), "page leaves modal mode");
    });

    QUnit.test("closes dialog closed while it is being shown", function (assert) {
        var done = assert.async(),
            dialog = ModalDialog.show({
                id: "fastClose",
                onhidden: function (dialog) {
                    assert.notOk(dialog.isOpened(), "dialog closed once it is shown");
                    done();
                }
            });

        dialog.close();
        assert.ok(dialog.isOpened(), "dialog is still being shown");
    });

    QUnit.module("BootstrapDialog", {
        afterEach: function () {
            $(".modal").remove();
            $(".modal-backdrop").remove();
            $(document.body).removeClass("modal-open");
        }
    });

    QUnit.test("adds header text color and disables buttons", function (assert) {
        var dialog = BootstrapDialog.show({
            animate: false,
            type: BootstrapDialog.TYPE_SUCCESS,
            message: $("<input type='text' autofocus>"),
            buttons: [{ id: "initiallyDisabled", label: "Disabled", disabled: true }]
        });

        assert.ok(dialog instanceof ModalDialog, "dialog created");
        assert.ok(dialog.getModalHeader().hasClass("text-success"), "header text color by type");
        assert.ok(dialog.getButton("initiallyDisabled").prop("disabled"), "button initially disabled");
        assert.ok(dialog.$modalBody.find("input").is(document.activeElement), "autofocus element focused");
        dialog.close();
    });

    QUnit.test("confirms", function (assert) {
        var done = assert.async(),
            results = [];

        // Confirmation dialogs are animated, the choice is made once each is shown
        function confirm (choice, callback) {
            var dialog = BootstrapDialog.confirm({
                type: BootstrapDialog.TYPE_DANGER,
                title: "Confirm",
                message: "Sure?",
                btnOKLabel: "Delete",
                callback: function (result) {
                    results.push(result);
                }
            });
            dialog.$modal.one("shown.bs.modal", function () {
                dialog.$modalFooter.find("button").eq(choice).trigger("click");
            });
            dialog.$modal.one("hidden.bs.modal", callback);
            return dialog;
        }

        var dialog = confirm(1, function () {
                confirm(0, function () {
                    assert.deepEqual(results, [true, false], "callback called with the choice");
                    done();
                });
            }),
            $buttons = dialog.$modalFooter.find("button");

        assert.notOk(dialog.options.closable, "confirmation is not closable");
        assert.equal($buttons.eq(1).text(), "Delete", "confirm button label");
        assert.ok($buttons.eq(1).hasClass("btn-danger"), "confirm button class by type");
    });
});
