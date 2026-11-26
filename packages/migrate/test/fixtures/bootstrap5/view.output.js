define([
    "jquery",
    "libs/bootstrap-dialog"
], function ($, BootstrapDialog) {
    return Backbone.View.extend({
        className: "card",
        events: {
            "click .btn-outline-primary": "save",
            "click [data-bs-toggle=tab]": "switchTab",
            "show.bs.dropdown .dropdown": "open"
        },
        render: function (size) {
            this.$el.find(".card-body > .float-end").addClass("d-none").removeClass("float-start");
            this.$(".col-sm-" + size).toggleClass("d-none", !this.visible);
            $("<div class=\"card card-body\"><span class=\"badge text-bg-info\">" + this.text + "</span></div>").appendTo(this.$el);
            this.$el.append(`<p class="text-body-secondary ${this.extra}">${this.description}</p>`);
            this.$el.on("click", ".btn-sm", this.remove);
            if (this.$el.hasClass("well") || this.$el.is(".modal.show")) {
                this.$el.removeClass("in");
            }
            this.$("[data-bs-toggle='tooltip']").tooltip({ allowList: {}, container: "body" });
            BootstrapDialog.show({ buttons: [{ label: "Close", cssClass: "btn-outline-primary" }] });
            var classes = "col-sm-6 col-xs-12";
            var trimmed = $.trim(this.text);
            return $(".items").size();
        }
    });
});
