var capturePhoto = (function(app) {
    "use strict";
	app = {
		Collections: {},
		Models: {},
		Views: {},
		// Instances
		collections: {},
		views: {},
		models: {},
		utils: {},
		global:{},
		init: function() {
            var initalizers = [];
            initalizers.push(
                $.ajax({
                    url: 'tpl/templates.html',
                    dataType: 'text'
                }).done(function(contents) {
                    $("#templates").append(contents);
                })
            );
            $.when.apply($, initalizers).done(function() {
                app.router = new app.Router();
                Backbone.history.start();
            });
        }
	};
	

    if (window.PhoneGap) {
        document.addEventListener("deviceready", app.init, false);
    } else {
        $(document).ready(app.init);
    }

    return app;
})(capturePhoto);