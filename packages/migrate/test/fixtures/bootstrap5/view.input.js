define([
    "jquery",
    "libs/bootstrap-dialog"
], function ($, BootstrapDialog) {
    return Backbone.View.extend({
        className: "panel panel-default",
        events: {
            "click .btn-default": "save",
            "click [data-toggle=tab]": "switchTab",
            "show.bs.dropdown .dropdown": "open"
        },
        render: function (size) {
            this.$el.find(".panel-body > .pull-right").addClass("hidden").removeClass("pull-left");
            this.$(".col-sm-" + size).toggleClass("hide", !this.visible);
            $("<div class=\"well\"><span class=\"label label-info\">" + this.text + "</span></div>").appendTo(this.$el);
            this.$el.append(`<p class="text-muted ${this.extra}">${this.description}</p>`);
            this.$el.on("click", ".btn-xs", this.remove);
            if (this.$el.hasClass("well") || this.$el.is(".modal.in")) {
                this.$el.removeClass("in");
            }
            this.$("[data-toggle='tooltip']").tooltip({ whiteList: {}, container: "body" });
            BootstrapDialog.show({ buttons: [{ label: "Close", cssClass: "btn-default" }] });
            var classes = "col-sm-6 col-xs-12";
            var trimmed = $.trim(this.text);
            return $(".items").size();
        }
    });
});
