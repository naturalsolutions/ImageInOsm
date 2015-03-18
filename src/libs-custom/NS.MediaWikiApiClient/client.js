/*
 * Tested against Mediawiki 1.19 (local instance) and 1.22 (test.wikipedia.org)
 */

var NS = window.NS || {};

NS.MediaWikiApiClient = (function() {
    "use strict";

    var mimeTypes = {
        'image/jpeg': '.jpg',
        'image/png': '.png'
    };

    var mwApiClient = function (basePath) {
        this.basePath = basePath;
        this.isLogged = false;
    };

    mwApiClient.prototype.logout = function () {
        return $.post(
            this.basePath + '?action=logout&format=json'
        );
    };

    mwApiClient.prototype.login = function (username, pass){
        var self = this,
            dfd = $.Deferred(),
            loginAPI = this.basePath + '?action=login&lgname=' + username + '&lgpassword=' + pass + '&format=json';
        $.post(loginAPI, function(data) {
            if (data.login.result == 'NeedToken') {
                $.post(loginAPI+'&lgtoken='+data.login.token, 
                function(data) {
                    if (!data.error) {
                        if (data.login.result == "Success") { 
                            self.username = username;
                            self.isLogged = true;
                            dfd.resolve();
                        } else {
                            dfd.reject({status: 3, msg: data.login.result});
                        }
                    } else {
                        dfd.reject({status: 6, msg: data.error});
                    }
                });
            } else {
                dfd.reject({status: 6, msg: data.error});
            }
        });
        return dfd.promise();
    };

    mwApiClient.prototype.getUniqueFileName = function (title, mimeType, suffix, namespace) {
        suffix = suffix || 0;
        namespace = namespace || 'File:';
        var dfd = $.Deferred(),
            fileName = namespace + title +
                       (suffix == 0 ? '' : '_' + suffix) +
                       ((mimeType in mimeTypes) ? mimeTypes[mimeType] : ''),
            self = this;
        this.getEditToken(fileName, false).then(
            function(token) {
                dfd.resolve(fileName);
            },
            function(err) {
                if (err.status == 3) {
                    self.getUniqueFileName(title, mimeType, suffix + 1).then(
                        function(fileName) {dfd.resolve(fileName);},
                        function(err) {dfd.reject(err);}
                    );
                } else {
                    dfd.reject(err);
                }
            }
        );
        return dfd.promise();
    };

    mwApiClient.prototype.getEditToken  = function (pageName, isUpdatable) {
        var dfd = $.Deferred();
        $.get(
            this.basePath + '?action=query&prop=info&intoken=edit&titles=' + pageName + '&format=json',
            function (data) {
                if (data.query.pages) {
                    //Si l'index de la page demandée est > 0 alors la page existe déjà dans le mediawiki
                    if (!( "-1" in data.query.pages) &&  (isUpdatable == false)) {
                        dfd.reject({status: 3, msg: 'Page already exist !'});
                    } else {
                        $.each(data.query.pages,function( index, page) {
                            var token = page.edittoken;
                            dfd.resolve(token);
                        });
                    }
                } else {
                    dfd.reject({status: 6, msg: data});
                }
            }
        );
        return dfd.promise();
    };

    mwApiClient.prototype.doApiCallUpload = function (token, fileToUpload, fileName, filetxt) {
        var dfd = $.Deferred(),
            formdata = new FormData(); 
        formdata.append("file", fileToUpload);
        formdata.append("text", filetxt);
        formdata.append("token", token);

        $.ajax({
            type: 'POST',
            url: this.basePath +
                 '?action=upload&format=json&ignorewarnings=1' +
                 '&filename=' + encodeURIComponent(fileName),
            contentType: false,
            processData: false,
            data: formdata,
            success: function(data) {
                if (data.upload) {
                    dfd.resolve(data);
                } else {
                    dfd.reject({status: 3, msg: data.error.info});
                }
            },
            error: function(xhr, status, error) {
                dfd.reject({status: status, msg: error});
            }
        });
        return dfd.promise();
    };


    mwApiClient.prototype.uploadFile = function (fileToUpload, fileName, isUpdatable, filetxt) {
        var dfd = $.Deferred(),
            self = this;
        this.getEditToken(fileName, isUpdatable).then(
            function (token) {
                self.doApiCallUpload(token, fileToUpload, fileName, filetxt)
                        .done(function (data) {dfd.resolve(data);})
                        .fail(function (err) {dfd.reject(err);});
            },
            function (err) {
                dfd.reject(err);
            }
        );
        return dfd.promise();
    };

    return mwApiClient;
}) ();
