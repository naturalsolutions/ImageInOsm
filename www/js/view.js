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

    function getNotificationCB(type) {
        return function (msg) {
            app.routeur.navigate('final', {trigger: true});
        }
    };

    app.Views.Capture = Backbone.View.extend({
        manage: true,

        events: {
            'click #send-button-flickr': 'onSendFlickr',
            'click #send-button-wikimedia': 'displayMediaWikiForm',
            'click #mwSubmit': 'onSendMediawiki',
            'input #mwTitle, #mwPassword, #mwUsername': 'onChangeMediawiki'
        },

        initialize : function(options) {
            this.template = _.template($('#capture-template').html());
            this.mode = options.mode;
            Backbone.View.prototype.initialize.apply(this, arguments);
        },

        serialize : function() {
            return {
                osmid: this.model.attributes.osmfeature.fid,
                imgsrc: this.model.attributes.data
            };
        },

        afterRender: function() {
            // Immediatly launch camera when view is rendered
            this.capturePhoto();
        },

        capturePhoto: function() {
            // Retrieve an image as a local path

            var source;
            switch (this.mode) {
                case 'camera': // User camera
                    source = navigator.camera.PictureSourceType.CAMERA;
                    break;
                case 'gallery': // Use local album
                    source = navigator.camera.PictureSourceType.SAVEDPHOTOALBUM;
                    break;
                default: // Should never happen
                    return;
            }
            navigator.camera.getPicture(
                _.bind(this.onSuccess, this),
                _.bind(this.onFail, this),
                {
                    quality: 50,
                    correctOrientation: false,
                    encodingType: navigator.camera.EncodingType.JPEG,
                    sourceType: source,
                    targetWidth: 1024,
                    destinationType: navigator.camera.DestinationType.FILE_URI
                });
        },

        onSuccess: function(imageURI) {
            app.models.pic.set({data: imageURI});
            this.$el.find('.img-preview img').attr('src', imageURI);
        },

        onFail: getNotificationCB('error'),

        onSendFlickr: function(e) {
            var imageURI = app.models.pic.attributes.data,
                feature = app.models.pic.attributes.osmfeature;
            this.server = new app.utils.FlickrAPI({
                consumerKey: '77f739a96134f39fcd38ff74c72b1fc8', // Application identifier (should be kept secret, don't use OAuth with JavaScript...)
                consumerSecret: 'a27edc675234f748',
                callbackUrl: 'http://fakeurl.com/' // Use any fake but valid URL as a callback, we just use it to intercept the callback redirection
            });
            this.server.sendPicture(imageURI, feature).then(
                getNotificationCB('success'), getNotificationCB('error')
            );
        },

        onSendMediawiki: function(e) {
            var imageURI = app.models.pic.attributes.data,
                feature = app.models.pic.attributes.osmfeature,
                mwTitle = $("#mwTitle").val(),
                mwDesc = $("#mwDescription").val() ;
            this.server = new app.utils.WikimediaAPI({
                username: $("#mwUsername").val(),
                password: $("#mwPassword").val()
            });
            this.server.sendPicture(imageURI, feature, mwTitle, mwDesc ).then(
                getNotificationCB('success'), getNotificationCB('error')
            );
        },

        onChangeMediawiki: function(e) {
            var valid = document.getElementById('mwTitle').validity.valid &&
                        document.getElementById('mwPassword').validity.valid &&
                        document.getElementById('mwUsername').validity.valid;
            $('#mwSubmit').attr('disabled', !valid);
        },

        displayMediaWikiForm: function(e) {
            $("#send-buttons").hide();
            $("#mediawiki-upload-form").removeClass('hide');
            $("#mediawiki-disclaimer").removeClass('hide');
            var mwUserName = localStorage.getItem('mwUsername'),
                mwPassword = localStorage.getItem('mwPassword');
            if (mwUserName === null) {
                $("#mediawiki-login-form").removeClass('hide');
                $("#mwUsername").focus();
            } else {
                $("#mwUsername").val(mwUserName);
                $("#mwPassword").val(mwPassword);
                $("#mwTitle").focus();
            }
        }
    });

    app.Views.Final = Backbone.View.extend({
        manage: true,
        template: "#final-template",

        events: {
            'click #restart': 'restart',
            'click #new-picture': 'newPicture',
            'click #exit': 'exit'
        },

        initialize : function(options) {
            this.status = 'TODO';
            this.message = 'TODO';
            Backbone.View.prototype.initialize.apply(this, arguments);
        },

        serialize: function() {
            return {
                status: this.status,
                message: this.message
            };
        },

        restart: function() {
            app.start();
        },

        newPicture: function() {
            app.routeur.navigate('capture', {trigger: true});
        },

        exit: function() {
            navigator.app.exitApp();
        }
    });
    
    app.Views.Navigation = Backbone.View.extend({
    
        template: '#navigate-template',
        
        el: $('#navigate-content'),
        
        events: {
            'click #btn1' : 'maps',
            'click #btn2' : 'takePicture',
            'click #btn3' : 'sendPicture',
            'click #btn4' : 'savedPicture'
        },
        initialize: function() {
            for(i=0; i<4; i++) {
                num = i+1;
                $('#navigate-content').append('<li><button class="btn-nav" id="btn' + num + '">'+ num +'</button></li>');
            }
        },
        
        maps: function() {
            app.routeur.navigate('maps', {trigger: true});
        },
        takePicture: function() {
            app.routeur.navigate('capture', {trigger: true});
            
        },
        sendPicture: function() {
            app.routeur.navigate('form', {trigger: true});
            
        },
        savedPicture: function() {
            app.routeur.navigate('final', {trigger: true});
            
        }
        
    });

    return app;
})(ImageInOsm);