var capturePhoto = (function(app) {
    "use strict";

    app.Views.OsmSelect = Backbone.Layout.extend({
        template: "#osm-selector-page",

        events: {
            'submit [name="osm-selector-form"]': 'onSubmit'
        },

        afterRender: function() {
            // Adding {manage: true} to BB.Form failed, hence this manual subview
            this.form = new Backbone.Form({model: app.models.pic, fields: ['osmid']});
            this.form.on('osmid:change', _.bind(this.onOsmSelectChange, this));
            this.$el.find('.osm-selector').empty().append(this.form.render().$el);
        },

        onOsmSelectChange: function(form, editor) {
            var val = editor.getValue();
            this.$el.find('.osm-selector-buttons button').prop('disabled', (val === null));
        },

        onSubmit: function(e) {
            // Don't actually submit the <form>
            e.preventDefault();

            this.form.commit();

            app.views.main.setView(new app.Views.Capture());
            app.views.main.render();
        }
    });

    app.Views.Capture = Backbone.View.extend({
        manage: true,

        events: {
            'click #send-button-flickr': 'onSendFlickr'
        },

        initialize : function() {
            this.template = _.template($('#capture-template').html());
        },

        serialize : function() {
            return {osmid: app.models.pic.attributes.osmid};
        },

        afterRender: function() {
            // Immediatly launch camera when view is rendered
            this.capturePhoto();
        },

        capturePhoto: function() {
			// Take picture using device camera and retrieve image as base64-encoded string
            navigator.camera.getPicture(
                _.bind(this.onSuccess, this),
                _.bind(this.onFail, this),
                {
                    quality: 50,
                    correctOrientation: false,
                    destinationType: navigator.camera.DestinationType.FILE_URI
                });
        },

        onSuccess: function(imageURI) {
            this.$el.find('.img-preview img').attr('src', imageURI);
        },

        onFail: function(message) {
            this.$el.find('.img-preview').hide();
            this.$el.find('.img-error').show();
            this.$el.find('#img-error-msg').html(message);
        },

        onSendFlickr: function(e) {
            // Use any valid URL as a callback, we just use it to intercept the callback redirection
            var callbackUrl = 'http://localhost/';
            // Application identifier (should be kept secret, don't use OAuth with JavaScript...)
            this.oauth = OAuth({
                consumerKey: '77f739a96134f39fcd38ff74c72b1fc8',
                consumerSecret: 'a27edc675234f748',
                callbackUrl: callbackUrl,
                requestTokenUrl: 'http://www.flickr.com/services/oauth/request_token',
                authorizationUrl: 'http://www.flickr.com/services/oauth/authorize',
                accessTokenUrl: 'http://www.flickr.com/services/oauth/access_token'
            });
            this.oauth.callbackUrl = callbackUrl; // Force OAuth to expose callback URL.

            // Handler for successful user-granted OAuth authorization
            window.plugins.childBrowser.onLocationChange = _.bind(function(url) {
                if (url.indexOf(this.oauth.callbackUrl) == 0) {
                    // First, close ChildBrowser which should be trying to parse our fake callbackUrl
                    window.plugins.childBrowser.close();
                    // Then, parse and use querystring
                    var params = url.substr(url.indexOf('?') + 1);
                    var token = this.oauth.parseTokenRequest(params);
                    //this.oauth.setAccessToken([token.oauth_token, token.oauth_token_secret]);
                    this.oauth.setVerifier(token.oauth_verifier);
                    // OAuth step 3: Finally exchange the request token for an ACCESS TOKEN
                    this.oauth.fetchAccessToken(
                        function(data) {
                            // TODO: Check user limits
                            // TODO: Send picture
                        },
                        function(data) {
                            // TODO: go to notification view
                            alert('Error:\n' + data.text);
                        }
                    );
                    return false;
                }
                return true;
            }, this);

            // Start OAuth authentication by obtaining a REQUEST TOKEN
            this.oauth.fetchRequestToken(
                function (url) {
                    // OAuth step 2: present authorization page to the user and (try to) obtain a VERIFIER in return
                    window.plugins.childBrowser.showWebPage(url + '&perms=write');
                },
                function (data) {
                    // TODO: go to notification view
                    var msg = "Error, the server reports: \n" + data.text;
                    if (data.text == 'oauth_problem=timestamp_refused')
                        msg += '\nServer time is: ' + data.responseHeaders.Date;
                    alert(msg);
                }
            );
        }
    });

    return app;
})(capturePhoto);