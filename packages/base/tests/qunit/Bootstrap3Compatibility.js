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
    "bootstrap"
], function ($, bootstrap) {
    var $fixture;

    QUnit.module("Bootstrap 3 compatibility", {
        beforeEach: function () {
            $fixture = $([
                '<div>',
                '<button type="button" id="bs3Toggle" data-toggle="collapse" data-target="#bs3Collapse"></button>',
                '<div class="collapse in" id="bs3Collapse"></div>',
                '<ul class="nav nav-tabs">',
                '<li class="active"><a href="#bs3Pane1" data-toggle="tab" id="bs3Tab1">1</a></li>',
                '<li><a href="#bs3Pane2" data-toggle="tab" id="bs3Tab2">2</a></li>',
                '</ul>',
                '<div class="tab-content">',
                '<div class="tab-pane active" id="bs3Pane1"></div><div class="tab-pane" id="bs3Pane2"></div>',
                '</div>',
                '</div>'
            ].join("")).appendTo(document.body);
        },
        afterEach: function () {
            $fixture.remove();
        }
    });

    QUnit.test("copies data attributes and shown state of collapsible elements", function (assert) {
        $("#bs3Toggle")[0].click();

        assert.equal($("#bs3Toggle").attr("data-bs-toggle"), "collapse", "toggle attribute copied");
        assert.equal($("#bs3Toggle").attr("data-bs-target"), "#bs3Collapse", "target attribute copied");
        assert.notOk($("#bs3Collapse").hasClass("in"), "Bootstrap 3 shown state replaced");
        assert.notOk($("#bs3Collapse").hasClass("show"), "collapsible element is being hidden by Bootstrap");
    });

    QUnit.test("switches tabs marked by Bootstrap 3 list items", function (assert) {
        $("#bs3Tab2")[0].click();

        assert.ok($("#bs3Pane2").hasClass("active") && !$("#bs3Pane1").hasClass("active"), "tab pane switched");
        assert.ok($("#bs3Tab2").parent().hasClass("active"), "list item of the shown tab is active");
        assert.notOk($("#bs3Tab1").parent().hasClass("active"), "list item of the previous tab is not active");
    });

    QUnit.test("accepts boolean tooltip and popover options given as strings", function (assert) {
        var $button = $('<button type="button" title="<b>Title</b>">Popover</button>').appendTo($fixture),
            popover;

        $button.popover({ html: "true", animation: "false", content: "Content" });
        popover = bootstrap.Popover.getInstance($button[0]);

        assert.ok(popover, "popover created");
        assert.strictEqual(popover._config.html, true, "html option converted");
        assert.strictEqual(popover._config.animation, false, "animation option converted");
        popover.dispose();
    });

    QUnit.test("affixes elements by the scroll position", function (assert) {
        var $element = $("<div></div>").appendTo($fixture);

        $element.affix({ offset: { top: 1000000 } });
        assert.ok($element.hasClass("affix-top") && !$element.hasClass("affix"), "element above the offset");

        $element.affix({ offset: { top: -1 } });
        assert.ok($element.hasClass("affix") && !$element.hasClass("affix-top"), "element past the offset");
    });
});
