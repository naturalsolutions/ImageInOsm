var capturePhoto = (function(app) {
    "use strict";

    app.Router = Backbone.Router.extend({

        routes: {
            "": "home"
        },

        home: function(){
            app.views.main = new Backbone.Layout({
                    template: "#main-layout"
            });
            $("#content").empty().append(app.views.main.el);
            app.views.main.setView(".captureContent", new app.Views.Capture());
            app.views.main.render();
        }
    });

    return app;
})(capturePhoto);