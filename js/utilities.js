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
                        _.bind(function(data) {this._dfd.auth.reject(this.buildOAuthErrorMessage(data));}, this)
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
                _.bind(function(data) {this._dfd.auth.reject(this.buildOAuthErrorMessage(data));}, this)
            );

            return this._dfd.auth;
        },

        callAPI: function(method, success, fail) {
            this.oauth.get(
                'http://api.flickr.com/services/rest?nojsoncallback=1&format=json&method=' + method,
                _.bind(function(data) {
                    var args = JSON.parse(data.text);
                    if (args.stat === 'ok') {
                        success(args);
                    } else {
                        fail(this.buildFlickrErrorMessage(args));
                    }
                }, this),
                _.bind(function(data) {fail(this.buildOAuthErrorMessage(data));}, this)
            );
        },

        getSizeLimit: function() {
            var dfd = $.Deferred();
            this.callAPI(
                'flickr.people.getUploadStatus',
                _.bind(function (args) {this.resolve(args.user.bandwidth.remainingkb);}, dfd),
                _.bind(dfd.reject, dfd)
            );
            return dfd;
        },

        sendPicture: function(imageURI, tags) {
            // TODO: test auth status (flickr.test.login) and authenticate only when necessary
            var dfd = $.Deferred();
            // Check user account limits (async level 1)
            this.getSizeLimit().then(
                _.bind(function(maxSize) {
                    this.maxSize = maxSize;
                    // Obtain a file descriptor (async level 2)
                    window.resolveLocalFileSystemURI(
                        this.imageURI,
                        _.bind(function (fe) {
                            // Convert to a sort of sub-descriptor... (async level 3)
                            fe.file(
                                _.bind(function (f) {
                                    // Actually compare file descriptor size with allowed size
                                    if (f.size > this.maxSize) {
                                        this.dfd.reject('Upload failed, you\'ve reached your Flickr monthly bandwith limit.');
                                    }
                                    // Finally, send the data
                                    // TODO: take advantage of onprogress + HTML5 progressBar
                                    this.oauth.postPG(
                                        'http://api.flickr.com/services/upload/',
                                        {
                                            uri: this.imageURI,
                                            key: 'photo',
                                            name: f.name,
                                            type: f.type,
                                            params: {is_public: '1', tags: this.tags}
                                        },
                                        _.bind(function (data) {
                                            var resp = $($.parseXML(data.response)).children(),
                                                stat = resp.attr('stat');
                                            if (stat === 'fail') {
                                                var err = resp.find('err');
                                                this.dfd.reject(this.flickrFail({
                                                    code: err.attr('code'),
                                                    message: err.attr('msg')
                                                }));
                                            } else {
                                                this.dfd.resolve({
                                                    photoid: resp.find('photoid').text()
                                                });
                                            }
                                        }, this),
                                        _.bind(function (err) {this.dfd.reject('An error occured while uploading the picture to Flickr (code: ' + err.code + ').');}, this)
                                    );
                                }, this),
                                _.bind(function (err) {this.dfd.reject('An error occured while reading the picture size from the camera (code: ' + err.code + ').');}, this)
                            );
                        }, this),
                        _.bind(function (err) {this.dfd.reject('An error occured while getting the picture from the camera (code: ' + err.code + ').');}, this)
                    );
                }, {dfd: dfd, imageURI: imageURI, oauth: this.oauth, tags: tags, flickrFail: this.buildFlickrErrorMessage}),
                _.bind(dfd.reject, dfd)
            );
            return dfd;
        },

        buildFlickrErrorMessage: function(args) {
            return 'Error while communicating with Flickr services.\nThe server reports: (' + args.code + ') ' + args.message;
        },

        buildOAuthErrorMessage: function(resp) {
            var args = this.oauth.parseTokenRequest(resp.text),
                msg = 'Error while communicating with Flickr services.\nThe server reports: oauth_problem=' + args.oauth_problem;
            if (args.oauth_problem === 'timestamp_refused') {
                msg += '\nServer time is: ' + resp.responseHeaders.Date;
            }
            return msg;
        }
    };

    return app;
})(capturePhoto);