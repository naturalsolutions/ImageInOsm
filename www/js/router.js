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
            'capture(/:mode)' : 'capture',
            'form' : 'form',
            'final' : 'finalScreen',
        },
        maps: function() {
            $('body').css('background', '#fff');
            $('#content > *').detach();
            if (! (app.views.map)) {
                app.views.map = new app.Views.Map();
                app.views.map.render();
            }
            app.views.map.$el.appendTo('#content');
        },
        capture: function(mode) {
            var source;
            if (mode === null) {
                mode = this.lastCaptureMode;
            }
            this.lastCaptureMode = mode;
            if (mode == 'gallery') {
                source = navigator.camera.PictureSourceType.SAVEDPHOTOALBUM;
            } else {
                source = navigator.camera.PictureSourceType.CAMERA;
            }
            navigator.camera.getPicture(
                function(imageURI) {
                    app.routeur.navigate('form', {trigger: true});
                    app.models.pic.set({data: imageURI});
                    
                    $('#btn2').removeClass('lastSelect');
                    $('#btn3').prop('disabled', false);
                    $('#btn3').removeClass('disable').addClass('active lastSelect');
                    $('#btn3 img').removeAttr('src').attr('src', 'img/upload.png');
                },
                function(msg) {
                    // Todo: show an error message?
                    // It is actually a good idea to just remain on the current view
                },
                {
                    quality: 50,
                    allowEdit : true,
                    correctOrientation: true,
                    encodingType: navigator.camera.EncodingType.JPEG,
                    sourceType: source,
                    targetWidth: 1024,
                    destinationType: navigator.camera.DestinationType.FILE_URI
                });
        },
        form: function() {
            if($('#btn4').prop('class', 'active')) {
                $('#btn4').prop('disabled', true);
                $('#btn4').removeClass('active').addClass('disable');
                $('#btn4 img').removeAttr('src').attr('src', 'img/Ufinish.png');
                $('#btn3').addClass('lastSelect');
            }
            $('body').css('background', '#111111');
            $('#content > *').detach();
            if (! (app.views.form)) {
                app.views.form = new app.Views.Form({model: app.models.pic});
                app.views.form.render();
            }
            app.views.form.$el.appendTo('#content');
        },
        finalScreen: function() {
            $('#content > *').detach();
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