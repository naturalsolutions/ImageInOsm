/*
 * Copyright 2013 Natural Solutions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var ImageInOsm = (function(app) {
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
            if (! (nav)) {
                var nav = new app.Views.Navigation();
                Backbone.history.start();
                
                $('#btn2').prop('disabled', true);
                $('#btn3').prop('disabled', true);
            }
            app.routeur.navigate('maps', {trigger: true});
            $('#btn4').prop('disabled', true);
        },
        // Main function
        init: function() {
            var initalizers = [],
                dfd;

            // Load templates (async)
            initalizers.push(
                $.ajax({
                    url: 'templates.html',
                    dataType: 'text'
                }).done(function(contents) {
                    $("#templates").append(contents);
                })
            );

            // Wait first response of Geolocation API before starting app
            dfd = $.Deferred();
            app.models.pos.once('change:coords', function() {this.resolve();}, dfd)
            //initalizers.push(dfd);

            // Watch current geographic position
            navigator.geolocation.watchPosition(
                function(position) {
                    app.models.pos.set({'coords': position.coords});
                },
                function(position) {
                    app.models.pos.clear();
                },
                {
                    maximumAge: 200000,
                    enableHighAccuracy: false
                }
            );

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
                width: document.getElementById('content').offsetWidth + 'px',
                height: document.getElementById('content').offsetHeight + 'px'
            };

            // Relay to system browser through InAppBrowser plugin
            $(document).on('click', '.external', function (e) {
                e.preventDefault();
                window.open($(this).attr('href'), '_system');
            });

            // Start app when everything is ready
            $.when.apply($, initalizers).done(function() {
                app.start();
            });
        }
    };

    // General map configuration
    app.global.mapExtent = {minx: -5.15, miny: 42.3, maxx: 8.25, maxy: 51.1};
    app.global.basemapOptions = {
        tileOptions: {crossOriginKeyword: null},
        numZoomLevels: 21
    };
    app.global.basemapUrl = [
        'http://a.tile.openstreetmap.fr/osmfr/${z}/${x}/${y}.png',
        'http://b.tile.openstreetmap.fr/osmfr/${z}/${x}/${y}.png',
        'http://c.tile.openstreetmap.fr/osmfr/${z}/${x}/${y}.png'
    ];

    if (window.cordova) {
        document.addEventListener("deviceready", app.init, false);
    } else {
        $(document).ready(app.init);
    }

    return app;
})(ImageInOsm);