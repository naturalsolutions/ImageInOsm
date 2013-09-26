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

    var Routeur = Backbone.Router.extend({
        routes: {
            'maps' : 'maps',
            'capture/:mode' : 'capture',
            'form' : 'form',
            'final' : 'finalScreen',
        },
        maps: function() {
            $('#content').empty();
            if (! (app.views.map)) {
                app.views.map = new app.Views.Map();
                app.views.map.render();
            }
            app.views.map.$el.appendTo('#content');
        },
        capture: function(mode) {
            var source ;
            if (mode == 'gallery') {
                source = navigator.camera.PictureSourceType.SAVEDPHOTOALBUM;
            } else {
                source = navigator.camera.PictureSourceType.CAMERA;
            }
            navigator.camera.getPicture(
                function(imageURI) {
                    app.models.pic.set({data: imageURI});
                    app.routeur.navigate('form', {trigger: true});
                },
                function(msg) {},
                {
                    quality: 50,
                    correctOrientation: false,
                    encodingType: navigator.camera.EncodingType.JPEG,
                    sourceType: source,
                    targetWidth: 1024,
                    destinationType: navigator.camera.DestinationType.FILE_URI
                });
        },
        form: function() {
            $('#content').empty();
            if (! (app.views.form)) {
                app.views.form = new app.Views.Capture({model: app.models.pic});
                app.views.form.render();
            }
            app.views.form.$el.appendTo('#content');
        },
        finalScreen: function() {
            $('#content').empty();
            if (! (app.views.notification)) {
                app.views.notification = new app.Views.Final();
                app.views.notification.render();
            }
            app.views.notification.$el.appendTo('#content');
        }
    });

    app.routeur = new Routeur();

    return app;
})(ImageInOsm);