var capturePhoto = (function(app) {
    "use strict";

    app.utils.FlickrAPI = function(options) {
        return this.initialize(options);
    };

    app.utils.FlickrAPI.prototype = {
        initialize: function(options) {
            this.oauth = OAuth(_.extend({
                requestTokenUrl: 'http://www.flickr.com/services/oauth/request_token',
                authorizationUrl: 'http://www.flickr.com/services/oauth/authorize',
                accessTokenUrl: 'http://www.flickr.com/services/oauth/access_token'
            }, options));
            this.oauth.callbackUrl = options.callbackUrl; // Force OAuth to expose callback URL.
            this._dfd = {};
            return this;
        },

        authenticate: function() {
            this._dfd.auth = $.Deferred();
            // Handler for successful user-granted OAuth authorization
            window.plugins.childBrowser.onLocationChange = _.bind(function(url) {
                if (url.indexOf(this.oauth.callbackUrl) === 0) {
                    // First, close ChildBrowser which should be trying to parse our fake callbackUrl
                    window.plugins.childBrowser.close();
                    // Then, parse and use querystring
                    var params = url.substr(url.indexOf('?') + 1),
                        token = this.oauth.parseTokenRequest(params);
                    //this.oauth.setAccessToken([token.oauth_token, token.oauth_token_secret]);
                    this.oauth.setVerifier(token.oauth_verifier);
                    // OAuth step 3: Finally exchange the request token for an ACCESS TOKEN
                    this.oauth.fetchAccessToken(
                        _.bind(function(data) {this._dfd.auth.resolve();}, this),
                        _.bind(function(data) {this._dfd.auth.reject(this.buildErrorMessage(data));}, this)
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
                _.bind(function(data) {this._dfd.auth.reject(this.buildErrorMessage(data));}, this)
            );

            return this._dfd.auth;
        },

        buildErrorMessage: function(resp) {
            var args = this.oauth.parseTokenRequest(resp.text),
                msg = "Error while communicating with Flickr services.\nThe server reports: oauth_problem=" + args.oauth_problem;
            if (args.oauth_problem === 'timestamp_refused') {
                msg += '\nServer time is: ' + resp.responseHeaders.Date;
            }
            return msg;
        }
    };

    return app;
})(capturePhoto);