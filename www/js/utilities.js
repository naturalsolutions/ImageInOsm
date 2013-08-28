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

var capturePhoto = (function(app) {
    "use strict";

    app.utils.geolocalize = function() {
        var dfd = $.Deferred();
        if (navigator.geolocation) {
            var callbackSuccess = $.proxy(function(position) {
                this.global.currentPosition = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                this.dfd.resolve();
            }, {dfd: dfd, global: app.global});
            var callbackError = $.proxy(function(position) {
                // Don't break any process if geolocation fail, just rely on default values
                this.dfd.resolve();
            }, {dfd: dfd});
            navigator.geolocation.getCurrentPosition(
                callbackSuccess,
                callbackError,
                {maximumAge: 200000, enableHighAccuracy: false}
            );
        } else {
            // Don't break any process if geolocation fail, just rely on default values
            dfd.resolve();
        }
        return dfd;
    };

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
            var storedToken = localStorage.getItem('FlickrAccessToken');
            if (storedToken !== null) {
                var token = JSON.parse(storedToken);
                this.oauth.setAccessToken(token);
            }
            this.oauth.callbackUrl = options.callbackUrl; // Force OAuth to expose callback URL.
            this._dfd = {};
            return this;
        },

        authenticate: function() {
            this._dfd.auth = $.Deferred();

            // Start OAuth authentication by obtaining a REQUEST TOKEN
            this.oauth.fetchRequestToken(
                _.bind(function (url) {
                    // OAuth step 2: present authorization page to the user and (try to) obtain a VERIFIER in return
                    var oauth_win = window.open(url + '&perms=write', '_blank', 'location=yes');
                    // Handler for successful user-granted OAuth authorization
                    oauth_win.addEventListener('loadstart', _.bind(function(event) {
                        if (event.url.indexOf(this.oauth.callbackUrl) === 0) {
                            // First, close ChildBrowser which should be trying to parse our fake callbackUrl
                            // oauth_win.close(); // https://issues.apache.org/jira/browse/CB-4586
                            // Then, parse and use querystring
                            var params = event.url.substr(event.url.indexOf('?') + 1),
                                token = this.oauth.parseTokenRequest(params);
                            this.oauth.setVerifier(token.oauth_verifier);
                            // OAuth step 3: Finally exchange the request token for an ACCESS TOKEN
                            this.oauth.fetchAccessToken(
                                _.bind(function(data) {
                                    localStorage.setItem('FlickrAccessToken', JSON.stringify(this.oauth.getAccessToken()));
                                    this._dfd.auth.resolve();
                                }, this),
                                _.bind(function(data) {this._dfd.auth.reject(this.buildOAuthErrorMessage(data));}, this)
                            );
                            return false;
                        }
                        return true;
                    }, this));
                }, this),
                _.bind(function(data) {this._dfd.auth.reject(this.buildOAuthErrorMessage(data));}, this)
            );

            return this._dfd.auth;
        },

        callAPI: function(method, params) {
            var dfd = $.Deferred();
            if (! params) params = {};
            params.method = method;
            this.oauth.get(
                'http://api.flickr.com/services/rest?nojsoncallback=1&format=json&' + $.param(params),
                _.bind(function(data) {
                    var args = JSON.parse(data.text);
                    if (args.stat === 'ok') {
                        dfd.resolve(args);
                    } else {
                        dfd.reject(this.buildFlickrErrorMessage(args));
                    }
                }, this),
                _.bind(function(data) {dfd.reject(this.buildOAuthErrorMessage(data));}, this)
            );
            return dfd;
        },

        getSizeLimit: function() {
            return this.callAPI(
                'flickr.people.getUploadStatus',
                {}
            );
        },

        setGeoPermissions: function(id) {
            return this.callAPI(
                'flickr.photos.geo.setPerms',
                {photo_id: id, is_public: 1, is_contact: 0, is_friend: 0, is_family: 0}
            );
        },

        setPictureLocation: function(id, location) {
            return this.callAPI(
                'flickr.photos.geo.setLocation',
                {photo_id: id, lat: location.y, lon: location.x}
            );
        },

        sendPicture: function(imageURI, feature) {
            var dfd = $.Deferred();
            // Authenticate if user has no access token
            if (this.oauth.getAccessTokenKey() === '') {
                this.authenticate().then(
                    _.bind(function () {
                        this.self.sendPicture(this.imageURI, this.feature).then(
                            _.bind(this.dfd.resolve, this.dfd),
                            _.bind(this.dfd.reject, this.dfd)
                        );
                    }, {self: this, dfd: dfd, feature: feature, imageURI: imageURI}),
                    _.bind(dfd.reject, dfd)
                );
                return dfd;
            }

            var location = feature.geometry.getCentroid().transform('EPSG:3857', 'EPSG:4326');
            var tags = 'osm:' + feature.fid.toLowerCase().replace(/\./g, '=') + ' ' +
                       'ImageInOsm ' +
                       'geotagged ' +
                       'geo:lat=' + location.y + ' ' +
                       'geo:lon=' + location.x + ' ';
            // Check user account limits (async level 1)
            this.getSizeLimit().then(
                _.bind(function(args) {
                    this.maxSize = args.user.bandwidth.remainingkb;
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
                                                this.dfd.reject(this.self.buildFlickrErrorMessage({
                                                    code: err.attr('code'),
                                                    message: err.attr('msg')
                                                }));
                                            } else {
                                                this.id = resp.find('photoid').text();
                                                // Add Flickr-style location information to the picture (async level 4)
                                                this.self.setPictureLocation(this.id, this.location).then(
                                                    _.bind(function(args) {
                                                        // Make the location public (async level 5)
                                                        this.self.setGeoPermissions(this.id).then(
                                                            _.bind(function(args) {
                                                                this.dfd.resolve('Picture was successfully uploaded to Flickr under the id ' + this.id);
                                                            }, this),
                                                            _.bind(function(msg) {
                                                                this.dfd.resolve('Picture was successfully uploaded to Flickr under the id ' + this.id + '. But we failed to make its location public.\Details:\n' + msg);
                                                            }, this)
                                                        );
                                                    }, this),
                                                    _.bind(function(msg) {
                                                        this.dfd.resolve('Picture was successfully uploaded to Flickr under the id ' + this.id + '. But we failed to set its location.\Details:\n' + msg);
                                                    }, this)
                                                );
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
                }, {dfd: dfd, imageURI: imageURI, oauth: this.oauth, tags: tags, self: this, location: location}),
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