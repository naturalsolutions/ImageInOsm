var capturePhoto = (function(app) {
    "use strict";
	app = {
		Models: {},
		Views: {},
		// Instances
		views: {},
		models: {},
		utils: {},
		global: {},
		init: function() {
            var initalizers = [];

            // Load templates (async)
            initalizers.push(
                $.ajax({
                    url: 'tpl/templates.html',
                    dataType: 'text'
                }).done(function(contents) {
                    $("#templates").append(contents);
                })
            );

            // Detect current geographic position
            if (navigator.geolocation) {
                var dfd = $.Deferred();
                var callbackSuccess = $.proxy(function(position) {
                    this.global.currentPosition = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    };
                    this.dfd.resolve();
                }, {dfd: dfd, global: app.global});
                var callbackError = $.proxy(function(position) {
                    // Don't break initialization if geolocation fail, just rely on default values
                    this.dfd.resolve();
                }, {dfd: dfd});
                navigator.geolocation.getCurrentPosition(
                    callbackSuccess,
                    callbackError,
                    {maximumAge: 200000, enableHighAccuracy: false}
                );
            }

            // Detect device width
            var e = window, a = 'inner';
            if (!('innerWidth' in window)) {
                a = 'client';
                e = document.documentElement || document.body;
            }
            app.global.viewportSize = {
                w: e[a + 'Width'],
                h: e[a + 'Height']
            };

            // Start app when everything is ready
            $.when.apply($, initalizers).done(function() {
                app.router = new app.Router();
                Backbone.history.start();
            });
        }
	};

    // General map configuration
    app.global.mapExtent = {minx:42.3, miny:-5.15, max:51.1, maxy:8.25};
    app.global.basemapUrl = [
        'http://a.tile.openstreetmap.fr/osmfr/${z}/${x}/${y}.png',
        'http://b.tile.openstreetmap.fr/osmfr/${z}/${x}/${y}.png',
        'http://c.tile.openstreetmap.fr/osmfr/${z}/${x}/${y}.png'
    ];

    if (window.PhoneGap) {
        document.addEventListener("deviceready", app.init, false);
    } else {
        $(document).ready(app.init);
    }

    return app;
})(capturePhoto);