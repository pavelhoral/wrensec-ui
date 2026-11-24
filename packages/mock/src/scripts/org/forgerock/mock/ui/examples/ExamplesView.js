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
    "org/forgerock/mock/ui/examples/CodeMirror",
    "bootstrap",
    "org/forgerock/commons/ui/common/main/AbstractView"
], function($, _,
        CodeMirror,
        bootstrap,
        AbstractView) {

    var ExamplesView = AbstractView.extend({
        template: "templates/mock/ExamplesTemplate.html",
        events: {
            "click #sidebar a": "slideNavigation"
        },
        render: function(args, callback) {
            this.parentRender(_.bind(function() {
                /*
                Code Snippets
                */
                this.$el.find('.example').each(function(i, elem) {

                    var snippet = $('.snippet')[i].innerHTML;

                    CodeMirror(elem, {
                        value: snippet,
                        mode: 'xml',
                        lineNumbers: false,
                        readOnly: true,
                        lineWrapping: false
                    });
                });

                this.$el.find('.code').each(function() {

                    var $this = $(this),
                        $code = $this.html();

                    $this.empty();

                    CodeMirror(this, {
                        value: $code,
                        mode: 'javascript',
                        lineNumbers: true,
                        readOnly: true,
                        lineWrapping: true
                    });
                });

                // Highlight the section in view in the (sticky) side navigation, the scroll spy of the previously
                // rendered style guide observes removed elements
                if ($.fn.scrollspy.Constructor.getInstance(document.body)) {
                    $(document.body).scrollspy("dispose");
                }
                $(document.body).scrollspy({
                    target: "#sidebar"
                });

                if (callback){
                    callback();
                }
            }, this));
        },
        /*
         Prevents redirection from hash. Also animates a smooth scroll
         */
        slideNavigation : function(event) {
            event.preventDefault();

            var target = $(event.target);

            target = $(target.attr("href"));

            if (target.length) {
                $('html,body').animate({
                    scrollTop: target.offset().top
                }, 1000);
            }
        }
    });

    return new ExamplesView();
});
