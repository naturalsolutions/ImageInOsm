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

    app.utils.WikimediaAPI = function(options) {
        return this.initialize(options);
    };

    app.utils.WikimediaAPI.prototype = {
        initialize: function(options) {
            this.client = new NS.MediaWikiApiClient('http://test.wikipedia.org/w/api.php');
            this.username = options.username;
            this.password = options.password;
            this.dfd = $.Deferred();

            // override upload method using cordova FileTransfer
            this.client.doApiCallUpload = function (token, fileToUpload, fileName, filetxt) {
                var dfd = $.Deferred(),
                    ft = new FileTransfer(),
                    options = new FileUploadOptions(),
                    url = this.basePath +
                          '?action=upload&format=json&filename=' +
                          encodeURIComponent(fileName) +
                          '&ignorewarnings=1&token=' +
                          encodeURIComponent(token);

                options.fileKey = 'file';
                options.fileName = fileName;
                options.mimeType = fileToUpload.type;
                options.params = {text: filetxt};
                options.chunkedMode = false;

                ft.upload(
                    fileToUpload.fullPath,
                    url,
                    function(resp) {
                        var data = JSON.parse(resp.response);
                        if (data.upload)
                            dfd.resolve(data);
                        else
                            dfd.reject({status: 3, msg: data.error.info}) ;
                    },
                    function(error){
                        dfd.reject({
                            status: error.code,
                            msg: "An error has occurred: Code = " +
                                 error.code +
                                 "upload error source " +
                                 error.source +
                                 "upload error target " +
                                 error.target
                        });
                    },
                    options
                );

                return dfd.promise();
            };
        },

        sendPicture: function(imageURI, feature, title, description) {
            this.feature = feature;
            this.title = title;
            this.description = description;
            this.client.login(this.username, this.password).then(
                _.bind(function() {
                    localStorage.setItem('mwUsername', this.username);
                    localStorage.setItem('mwPassword', this.password);
                    window.resolveLocalFileSystemURI(
                        imageURI,
                        _.bind(function(fe) {
                            fe.file(
                                _.bind(function(f) {
                                    this.client.getUniqueFileName(this.title, f.type).done(_.bind(function(fileName) {
                                        var location = this.feature.geometry.getCentroid().transform('EPSG:3857', 'EPSG:4326'),
                                            content = '{{Information \n'+
                                                      '|Description=' + this.description + '\n' +
                                                      '|Source={{Self-photographed}}\n' +
                                                      '|Date=' + new Date().toJSON() + '\n' +
                                                      '|Author=' + (this.username ? '[[User:' + this.username + '|' + this.username + ']]' : '') + '\n' +
                                                      '|Permission={{Self|cc-by-3.0}}}}\n\n' +
                                                      '{{location dec|' + location.y + '|' + location.x + '}}\n\n' +
                                                      '{{On OSM|type=' +
                                                       (this.feature.geometry instanceof OpenLayers.Geometry.Point ? 'node' : 'way') +
                                                       '|OSM_ID=' + this.feature.osm_id + '}}\n\n' +
                                                       '[[Category:OSM]][[Category:ImageInOsm]]\n';
                                        this.client.uploadFile(f, fileName, false, content).then(
                                            _.bind(function(data) {
                                                this.dfd.resolve('Picture was successfully uploaded under the name <a href="' +
                                                                 data.upload.imageinfo.descriptionurl +
                                                                 '" class="external">' +
                                                                 data.upload.filename +
                                                                 '</a>');
                                            }, this),
                                            _.bind(function(err) {
                                                this.dfd.reject('Cannot upload this file. WikiMedia API return code ' + err.status +
                                                                ' and said: "' + err.msg + '".');
                                            }, this)
                                        );
                                    }, this)).fail(_.bind(function(err) {
                                        this.dfd.reject('Cannot find a unique name for this file. WikiMedia API return code ' + err.status +
                                                        ' and said: "' + err.msg + '".');
                                    }, this));
                                }, this),
                                _.bind(function(err) {
                                    this.dfd.reject('Cannot read camera output (code: ' + err.code + ').');
                                }, this)
                            );
                        }, this),
                        _.bind(function(err) {
                            this.dfd.reject('An error occured while getting the picture from the camera (code: ' + err.code + ').');
                        }, this)
                    );
                }, this),
                _.bind(function(err) {
                    this.dfd.reject('Authentication failed. WikiMedia API return code ' + err.status + ' and said: "' + err.msg + '".');
                }, this)
            );
            return this.dfd;
        },
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
                            oauth_win.close();
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