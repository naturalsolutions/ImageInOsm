var capturePhoto = (function(app) {
    "use strict";
	app = {
		// Classes
		Models: {},
		Views: {},
		// Instances
		views: {},
		models: {},
		global: {},
		// Other
		utils: {},
        // Begin user interaction
        start: function() {
            if ('main' in app.views) {
                app.views.main.setView(new app.Views.OsmSelect());
                app.views.main.render();
            }
        },
		// Main function
		init: function() {
            var initalizers = [],
                dfd;

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
            initalizers.push(app.utils.geolocalize());

            // Set map size depending on device width
            var e = window, a = 'inner';
            if (!('innerWidth' in window)) {
                a = 'client';
                e = document.documentElement || document.body;
            }
            app.global.viewportSize = {
                w: e[a + 'Width'],
                h: e[a + 'Height']
            };
            app.global.mapSize = {
                width: (app.global.viewportSize.w - 40) + 'px',
                height: (app.global.viewportSize.h - 100) + 'px'
            };

            // Start app when everything is ready
            $.when.apply($, initalizers).done(function() {
                app.views.main = new Backbone.Layout({
                    template: '#main-layout',
                    el: $('#content')
                });
                app.start();
            });
        }
	};

    // General map configuration
    app.global.mapExtent = {minx: -5.15, miny: 42.3, maxx: 8.25, maxy: 51.1};
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